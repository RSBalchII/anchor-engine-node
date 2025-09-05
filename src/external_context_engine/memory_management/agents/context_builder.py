"""
Context Builder Implementation

Responsible for building coherent, token-aware context from memory paths,
with support for progressive summarization and technical detail preservation.
"""

import asyncio
import logging
from typing import List, Dict, Any, Optional
from datetime import datetime
import re

from ..models import MemoryPath, MemoryContext, SummarizationStrategy


logger = logging.getLogger(__name__)


class ContextBuilder:
    """
    Context Builder for creating token-aware summaries from memory paths.
    
    Supports multiple summarization strategies and ensures context fits
    within LLM token limits.
    """
    
    def __init__(self, llm, tokenizer=None, config: Optional[Dict[str, Any]] = None):
        """
        Initialize Context Builder.
        
        Args:
            llm: Language model for abstractive summarization
            tokenizer: Tokenizer for counting tokens
            config: Configuration dictionary
        """
        self.llm = llm
        self.tokenizer = tokenizer
        self.config = config or {}
        
        # Configuration
        self.max_tokens = self.config.get("max_context_tokens", 4096)
        self.strategy = SummarizationStrategy(
            self.config.get("summarization_strategy", "progressive")
        )
        self.preserve_technical = self.config.get("preserve_technical_details", True)
        
        # Token estimation (rough if no tokenizer)
        self.tokens_per_word = 1.3  # Average for English
        
        logger.info(f"Context Builder initialized with {self.strategy} strategy, max tokens: {self.max_tokens}")
    
    async def build_context(
        self,
        memory_paths: List[MemoryPath],
        query: str,
        metadata: Optional[Dict[str, Any]] = None
    ) -> MemoryContext:
        """
        Build coherent context from memory paths.
        
        Args:
            memory_paths: List of memory paths to summarize
            query: Original query for context
            metadata: Additional metadata
            
        Returns:
            MemoryContext with token-aware summary
        """
        if not memory_paths:
            return MemoryContext(
                query=query,
                summary="No relevant memories found for your query.",
                paths=[],
                relevance_score=0.0,
                token_count=0,
                processing_time_ms=0,
                metadata=metadata or {}
            )
        
        start_time = datetime.utcnow()
        
        try:
            # Extract information from paths
            node_info = self._extract_node_information(memory_paths)
            
            # Rank by relevance and recency
            ranked_info = self._rank_information(node_info)
            
            # Apply summarization strategy
            if self.strategy == SummarizationStrategy.PROGRESSIVE:
                context = await self._progressive_summarize(ranked_info)
            elif self.strategy == SummarizationStrategy.EXTRACTIVE:
                context = await self._extractive_summarize(ranked_info)
            elif self.strategy == SummarizationStrategy.ABSTRACTIVE:
                context = await self._abstractive_summarize(ranked_info)
            else:
                context = self._simple_concatenation(ranked_info)
            
            # Ensure token compliance
            context = self._enforce_token_limit(context)
            
            # Add structure and formatting
            formatted_context = self._format_context(context, query)
            
            # Count tokens
            token_count = self._count_tokens(formatted_context)
            
            # Calculate relevance score
            avg_score = sum(p.score for p in memory_paths) / len(memory_paths)
            
            # Calculate processing time
            processing_time = (datetime.utcnow() - start_time).total_seconds() * 1000
            
            return MemoryContext(
                query=query,
                summary=formatted_context,
                paths=memory_paths,
                relevance_score=avg_score,
                token_count=token_count,
                processing_time_ms=processing_time,
                metadata=metadata or {}
            )
            
        except Exception as e:
            logger.error(f"Error building context: {str(e)}", exc_info=True)
            return MemoryContext(
                query=query,
                summary=f"Error building context: {str(e)}",
                paths=memory_paths,
                relevance_score=0.0,
                token_count=0,
                processing_time_ms=0,
                metadata=metadata or {}
            )
    
    def _extract_node_information(self, paths: List[MemoryPath]) -> List[Dict[str, Any]]:
        """Extract and deduplicate information from paths."""
        seen_nodes = set()
        node_info = []
        
        for path in paths:
            for i, node in enumerate(path.nodes):
                if node not in seen_nodes:
                    seen_nodes.add(node)
                    
                    # Extract node information
                    info = {
                        "name": node,
                        "path_index": paths.index(path),
                        "position": i,
                        "score": path.score,
                        "relationships": []
                    }
                    
                    # Add relationships if available
                    if i < len(path.relationships):
                        info["relationships"] = path.relationships[i:]
                    
                    node_info.append(info)
        
        return node_info
    
    def _rank_information(self, node_info: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Rank information by relevance and importance."""
        # Sort by score (relevance) and position (earlier = more important)
        ranked = sorted(
            node_info,
            key=lambda x: (x["score"], -x["position"]),
            reverse=True
        )
        
        # If preserving technical details, move technical terms up
        if self.preserve_technical:
            technical_terms = []
            non_technical = []
            
            for info in ranked:
                if self._is_technical_term(info["name"]):
                    technical_terms.append(info)
                else:
                    non_technical.append(info)
            
            # Interleave technical and non-technical
            ranked = []
            while technical_terms or non_technical:
                if technical_terms:
                    ranked.append(technical_terms.pop(0))
                if non_technical and len(non_technical) > len(technical_terms):
                    ranked.append(non_technical.pop(0))
        
        return ranked
    
    def _is_technical_term(self, term: str) -> bool:
        """Check if a term is technical."""
        # Simple heuristic for technical terms
        technical_patterns = [
            r'^[A-Z_]+$',  # All caps (constants)
            r'^\w+\(\)$',  # Function names
            r'^\w+\.\w+',  # Dotted names
            r'^/\w+',      # Paths
            r'^\w+::\w+',  # Namespaced
            r'^v?\d+\.\d+', # Version numbers
        ]
        
        for pattern in technical_patterns:
            if re.match(pattern, term):
                return True
        
        # Check for common technical keywords
        tech_keywords = [
            'api', 'config', 'database', 'function', 'class', 'method',
            'variable', 'parameter', 'return', 'error', 'exception',
            'async', 'await', 'promise', 'callback', 'query', 'response'
        ]
        
        term_lower = term.lower()
        return any(keyword in term_lower for keyword in tech_keywords)
    
    async def _progressive_summarize(self, ranked_info: List[Dict[str, Any]]) -> str:
        """
        Progressive summarization that maintains detail levels.
        
        Start with most important information and progressively add detail
        until token limit is reached.
        """
        sections = []
        current_tokens = 0
        
        # Level 1: Core concepts (top 20%)
        core_count = max(1, len(ranked_info) // 5)
        core_concepts = ranked_info[:core_count]
        
        core_section = "**Core Concepts:**\n"
        for info in core_concepts:
            core_section += f"- {info['name']}"
            if info['relationships']:
                core_section += f" (relates to: {', '.join(r.get('to', '') for r in info['relationships'][:2])})"
            core_section += "\n"
        
        sections.append(core_section)
        current_tokens = self._count_tokens("\n".join(sections))
        
        # Level 2: Supporting details (next 30%)
        if current_tokens < self.max_tokens * 0.5:
            support_count = max(1, len(ranked_info) // 3)
            support_info = ranked_info[core_count:core_count + support_count]
            
            if support_info:
                support_section = "\n**Supporting Details:**\n"
                for info in support_info:
                    support_section += f"- {info['name']}: "
                    if info['relationships']:
                        rel_str = self._format_relationships(info['relationships'][:1])
                        support_section += rel_str
                    support_section += "\n"
                
                sections.append(support_section)
                current_tokens = self._count_tokens("\n".join(sections))
        
        # Level 3: Additional context (remaining)
        if current_tokens < self.max_tokens * 0.8:
            remaining = ranked_info[core_count + support_count:]
            
            if remaining:
                context_section = "\n**Additional Context:**\n"
                for info in remaining[:10]:  # Limit to prevent overflow
                    if current_tokens >= self.max_tokens * 0.9:
                        break
                    context_section += f"- {info['name']}\n"
                    current_tokens += self._count_tokens(f"- {info['name']}\n")
                
                sections.append(context_section)
        
        return "\n".join(sections)
    
    async def _extractive_summarize(self, ranked_info: List[Dict[str, Any]]) -> str:
        """
        Extractive summarization selecting most important sentences.
        """
        sentences = []
        
        for info in ranked_info:
            # Create sentence from node information
            sentence = f"{info['name']}"
            
            if info['relationships']:
                relationships = info['relationships'][:2]
                if relationships:
                    rel_str = ", ".join(r.get('type', 'relates to') + " " + r.get('to', '') 
                                      for r in relationships)
                    sentence += f" ({rel_str})"
            
            sentences.append(sentence)
        
        # Select sentences that fit within token limit
        selected = []
        current_tokens = 0
        
        for sentence in sentences:
            sentence_tokens = self._count_tokens(sentence)
            if current_tokens + sentence_tokens <= self.max_tokens:
                selected.append(sentence)
                current_tokens += sentence_tokens
            else:
                break
        
        return "Key information extracted:\n" + "\n".join(f"• {s}" for s in selected)
    
    async def _abstractive_summarize(self, ranked_info: List[Dict[str, Any]]) -> str:
        """
        Abstractive summarization using LLM to generate new text.
        """
        # Prepare input for LLM
        input_text = "Summarize the following concepts and relationships:\n\n"
        
        for info in ranked_info[:20]:  # Limit input size
            input_text += f"- Concept: {info['name']}\n"
            if info['relationships']:
                input_text += f"  Relationships: {self._format_relationships(info['relationships'][:2])}\n"
        
        # Add instruction
        prompt = f"""
        {input_text}
        
        Create a coherent summary that:
        1. Maintains technical accuracy
        2. Preserves important relationships
        3. Stays under {self.max_tokens} tokens
        4. Uses clear, concise language
        
        Summary:
        """
        
        try:
            # Generate summary using LLM
            summary = await asyncio.to_thread(self.llm.invoke, prompt)
            return summary.strip()
        except Exception as e:
            logger.error(f"Abstractive summarization failed: {e}")
            # Fallback to extractive
            return await self._extractive_summarize(ranked_info)
    
    def _simple_concatenation(self, ranked_info: List[Dict[str, Any]]) -> str:
        """Simple concatenation of information."""
        lines = []
        
        for info in ranked_info:
            line = f"• {info['name']}"
            if info['relationships']:
                line += f" → {info['relationships'][0].get('to', 'related')}"
            lines.append(line)
        
        return "Memory contents:\n" + "\n".join(lines)
    
    def _format_relationships(self, relationships: List[Dict[str, Any]]) -> str:
        """Format relationships into readable text."""
        if not relationships:
            return ""
        
        rel_strs = []
        for rel in relationships:
            rel_type = rel.get('type', 'relates to')
            target = rel.get('to', 'unknown')
            rel_strs.append(f"{rel_type} {target}")
        
        return ", ".join(rel_strs)
    
    def _enforce_token_limit(self, context: str) -> str:
        """Ensure context stays within token limit."""
        current_tokens = self._count_tokens(context)
        
        if current_tokens <= self.max_tokens:
            return context
        
        # Truncate with ellipsis
        lines = context.split('\n')
        truncated = []
        tokens_used = 0
        
        for line in lines:
            line_tokens = self._count_tokens(line)
            if tokens_used + line_tokens <= self.max_tokens - 10:  # Reserve for ellipsis
                truncated.append(line)
                tokens_used += line_tokens
            else:
                truncated.append("... [truncated for token limit]")
                break
        
        return '\n'.join(truncated)
    
    def _format_context(self, context: str, query: str) -> str:
        """Add structure and formatting to context."""
        formatted = f"## Memory Context for Query\n\n"
        formatted += f"**Query:** {query}\n\n"
        formatted += f"**Retrieved Context:**\n\n{context}\n"
        
        return formatted
    
    def _count_tokens(self, text: str) -> int:
        """Count tokens in text."""
        if self.tokenizer:
            try:
                return len(self.tokenizer.encode(text))
            except Exception as e:
                logger.warning(f"Tokenizer failed: {e}, using estimate")
        
        # Rough estimation
        words = len(text.split())
        return int(words * self.tokens_per_word)
