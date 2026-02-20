# OmegaUse: Building a General-Purpose GUI Agent for Autonomous Task Execution
> **Source**: https://arxiv.org/html/2601.20380v1
> **Date**: 2026-01-31T00:56:42.375Z
> **Description**: 

---

# OmegaUse: Building a General-Purpose GUI Agent for Autonomous Task Execution

Le Zhang∗, Yixiong Xiao∗, Xinjiang Lu∗, Jingjia Cao∗, Yusai Zhao∗, Jingbo Zhou∗†,  
Lang An, Zikan Feng, Wanxiang Sha, Yu Shi, Congxi Xiao, Jian Xiong, Yankai Zhang,  
Hua Wu†, Haifeng Wang†  
Baidu Frontier Research Department  
\*Equal contribution; †Contact authors:{zhoujingbo, wu\_hua, wanghaifeng}@baidu.com

###### Abstract

Graphical User Interface (GUI) agents show great potential for enabling foundation models to complete real-world tasks, revolutionizing human–computer interaction and improving human productivity. In this report, we present OmegaUse, a general-purpose GUI agent model for autonomous task execution on both mobile and desktop platforms, supporting computer–use and phone-use scenarios. Building an effective GUI agent model relies on two factors: (1) high-quality data and (2) effective training methods. To address these, we introduce a carefully engineered data-construction pipeline and a decoupled training paradigm. For data construction, we leverage rigorously curated open-source datasets and introduce a novel automated synthesis framework that integrates bottom-up autonomous exploration with top-down taxonomy-guided generation to create high-fidelity synthetic data. For training, to better leverage these data, we adopt a two-stage strategy: Supervised Fine-Tuning (SFT) to establish fundamental interaction syntax, followed by Group Relative Policy Optimization (GRPO) to improve spatial grounding and sequential planning. To balance computational efficiency with agentic reasoning capacity, OmegaUse is built on a Mixture-of-Experts (MoE) backbone. To evaluate cross-terminal capabilities in an offline setting, we introduce OS-Nav, a benchmark suite spanning multiple operating systems: ChiM-Nav, targeting Chinese Android mobile environments, and Ubu-Nav, focusing on routine desktop interactions on Ubuntu. Extensive experiments show that OmegaUse is highly competitive across established GUI benchmarks, achieving a state-of-the-art (SOTA) score of 96.3% on ScreenSpot-V2 and a leading 79.1% step success rate on AndroidControl. OmegaUse also performs strongly on OS-Nav, reaching 74.24% step success on ChiM-Nav and 55.9% average success on Ubu-Nav.

## 1  Introduction

GUI agents have recently emerged as a transformative frontier for multimodal interaction, enabling artificial intelligence to navigate digital environments ranging from mobile applications to desktop software in a manner analogous to human users Hong et al. ([2024](https://arxiv.org/html/2601.20380v1#bib.bib33 "CogAgent: a visual language model for gui agents")); Qin et al. ([2025](https://arxiv.org/html/2601.20380v1#bib.bib12 "Ui-tars: pioneering automated gui interaction with native agents")); Wu et al. ([2024](https://arxiv.org/html/2601.20380v1#bib.bib35 "OS-atlas: a foundation action model for generalist gui agents")). By perceiving screen states through screenshots and executing atomic actions such as clicking, typing, and scrolling, these agents aim to bridge the gap between high-level user intent and complex operational sequences Hong et al. ([2024](https://arxiv.org/html/2601.20380v1#bib.bib33 "CogAgent: a visual language model for gui agents")); Cheng et al. ([2024](https://arxiv.org/html/2601.20380v1#bib.bib4 "Seeclick: harnessing gui grounding for advanced visual gui agents")), as illustrated in Figure [1](https://arxiv.org/html/2601.20380v1#S1.F1 "Figure 1 ‣ 1 Introduction ‣ OmegaUse: Building a General-Purpose GUI Agent for Autonomous Task Execution"). Depending on the target platform, they are often referred to as computer-use, phone-use, or browser-use agents.

Despite significant progress, current GUI agents still face critical bottlenecks in performance, training-data quality, and the lack of comprehensive evaluation across diverse digital ecosystems. To address these challenges, we present OmegaUse, a general-purpose GUI agent model111While the term “GUI agent” typically refers to the full system that interacts with a digital environment (e.g., including external tools), our work focuses on end-to-end model training. We treat GUI agentic capability as a high-level policy learned via a dedicated model-based approach. designed for autonomous task execution. We name the agent OmegaUse to reflect its unified support for both computer-use and phone-use scenarios across diverse platforms. OmegaUse is built on a Mixture-of-Experts (MoE) backbone. Compared with compact dense models (e.g., 7B or 72B) Qin et al. ([2025](https://arxiv.org/html/2601.20380v1#bib.bib12 "Ui-tars: pioneering automated gui interaction with native agents")); Gu et al. ([2025](https://arxiv.org/html/2601.20380v1#bib.bib1 "Ui-venus technical report: building high-performance ui agents with rft")); Bai et al. ([2025b](https://arxiv.org/html/2601.20380v1#bib.bib36 "Qwen2.5-vl technical report")), this design preserves the reasoning capacity of large-parameter models while activating only a subset of parameters, enabling superior performance with substantially reduced computational overhead.

![Refer to caption](x1.png)

Figure 1: An overview of OmegaUse’s core capabilities in realistic GUI scenarios.

We acknowledge that data quality is a primary determinant of GUI agent model performance, as noisy training signals can substantially degrade both spatial perception and decision-making. In grounding tasks, labels automatically derived from HTML or Accessibility (A11y) trees often suffer from rendering offsets, leading to misaligned bounding boxes and ambiguous textual descriptions Cheng et al. ([2024](https://arxiv.org/html/2601.20380v1#bib.bib4 "Seeclick: harnessing gui grounding for advanced visual gui agents")); Gu et al. ([2025](https://arxiv.org/html/2601.20380v1#bib.bib1 "Ui-venus technical report: building high-performance ui agents with rft")). Moreover, existing navigation datasets frequently contain inconsistencies, such as incorrect execution trajectories and excessive redundant actions, that provide weak or incoherent supervision for long-horizon planning Gu et al. ([2025](https://arxiv.org/html/2601.20380v1#bib.bib1 "Ui-venus technical report: building high-performance ui agents with rft")); Li et al. ([2024](https://arxiv.org/html/2601.20380v1#bib.bib9 "On the effects of data scale on ui control agents")).

To address these issues, we develop a high-quality training-corpus construction pipeline. For grounding, we apply a stringent filtering procedure to improve label precision. For navigation, we propose a novel hierarchical synthesis framework that integrates three complementary data sources: (1) rigorously curated open-source datasets, (2) automatically synthesized trajectories generated by combining bottom-up autonomous exploration with top-down taxonomy-guided generation, and (3) high-fidelity cross-terminal expert demonstrations.

To effectively leverage the curated data, we propose a decoupled two-stage training paradigm. We first apply supervised fine-tuning (SFT) to establish foundational interaction syntax and basic task logic Hong et al. ([2024](https://arxiv.org/html/2601.20380v1#bib.bib33 "CogAgent: a visual language model for gui agents")); Qin et al. ([2025](https://arxiv.org/html/2601.20380v1#bib.bib12 "Ui-tars: pioneering automated gui interaction with native agents")). We then employ Group Relative Policy Optimization (GRPO) to refine spatial grounding and sequential planning DeepSeek-AI ([2025](https://arxiv.org/html/2601.20380v1#bib.bib39 "DeepSeek-r1: incentivizing reasoning capability in llms via reinforcement learning")); Shao et al. ([2024](https://arxiv.org/html/2601.20380v1#bib.bib40 "DeepSeekMath: pushing the limits of mathematical reasoning in open language models")); Gu et al. ([2025](https://arxiv.org/html/2601.20380v1#bib.bib1 "Ui-venus technical report: building high-performance ui agents with rft")). With specialized reward design, such as an _Inside-of-Bounding-Box_ reward for grounding and stepwise coordinate-based rewards for navigation, OmegaUse is encouraged to focus on precise interaction regions rather than ambiguous boundary pixels Gu et al. ([2025](https://arxiv.org/html/2601.20380v1#bib.bib1 "Ui-venus technical report: building high-performance ui agents with rft")); Zhou et al. ([2025b](https://arxiv.org/html/2601.20380v1#bib.bib41 "GUI-g1: understanding r1-zero-like training for visual grounding in gui agents")); Tang et al. ([2025a](https://arxiv.org/html/2601.20380v1#bib.bib42 "GUI-g2: gaussian reward modeling for gui grounding")).

Beyond architecture and training strategies, we observe that existing benchmarks may not fully capture an agent’s proficiency across diverse digital environments, such as Chinese mobile applications or multi-step desktop workflows. To complement current evaluation resources, we introduce OS-Nav222https://huggingface.co/datasets/baidu-frontier-research/OS-Nav, a specialized offline benchmark comprising two sub-benchmarks across different operating systems: ChiM-Nav, focusing on Chinese Android mobile systems, and Ubu-Nav, targeting routine desktop interactions on Ubuntu. Both datasets provide expert-verified reasoning trajectories, enabling a more comprehensive evaluation of agent generalization and planning consistency.

Through extensive empirical evaluations, we demonstrate that OmegaUse consistently outperforms or remains competitive with SOTA GUI agents across multiple platforms. On standard grounding benchmarks, OmegaUse achieves a record 96.3% on ScreenSpot-V2. In navigation tasks, it reaches a leading 79.1% step success rate on AndroidControl and demonstrates robust interactive capabilities on AndroidWorld. Furthermore, on our proposed benchmarks, OmegaUse delivers superior performance with a 74.24% step success rate on ChiM-Nav and a 55.9% average success rate on Ubu-Nav. These results underscore the effectiveness of OmegaUse agent.

Our main contributions are summarized as follows:

*   •
    
    We introduce OmegaUse, a general-purpose GUI agent built on a parameter-efficient MoE architecture for autonomous task execution. OmegaUse is trained using a decoupled two-stage paradigm, and we present a holistic framework for building GUI agents that jointly addresses data construction and model training.
    
*   •
    
    We establish a high-quality data foundation for GUI agents. In particular, we propose a hierarchical navigation data construction pipeline featuring a novel automated synthesis framework that combines bottom-up autonomous exploration with top-down taxonomy-guided generation. This approach substantially reduces reliance on manual annotations while ensuring data diversity, coverage, and fidelity across platforms.
    
*   •
    
    To bridge the evaluation gap in specific digital environments, we release OS-Nav, a specialized offline benchmark suite comprising ChiM-Nav for Chinese Android mobile ecosystems and Ubu-Nav for routine Ubuntu desktop system. OS-Nav enables rigorous assessment of cross-platform generalization and planning consistency.
    
*   •
    
    Extensive empirical evaluations demonstrate that OmegaUse achieves highly competitive performance across a wide range of GUI benchmarks, including state-of-the-art results on several tasks. Notably, OmegaUse attains a record 96.3% accuracy on ScreenSpot-V2 and a leading 79.1% step success rate on AndroidControl.
    

## 2  Related Work

Recent years have witnessed rapid progress in GUI agents, which are models that perceive GUI states (e.g., screenshots and/or structured UI representations) and execute actions (e.g., clicking, typing, and scrolling) to accomplish user goals. In this section, we review prior work along two main axes: (1) UI grounding and GUI perception; and (2) GUI agent architectures, including modular pipelines and native (end-to-end) agent models.

### 2.1  UI Grounding and GUI Perception

Accurate _UI grounding_, which aligns natural language references with specific GUI elements on the screen, is widely recognized as a core bottleneck for GUI agents. A representative line of work focuses on grounding-centric models that localize UI elements directly from screenshots and instructions, while establishing standardized evaluations for cross-platform generalization. Early approaches typically relied on supervised learning over annotated screenshots, predicting click points or bounding boxes conditioned on natural language instructions Yang et al. ([2023](https://arxiv.org/html/2601.20380v1#bib.bib13 "Set-of-mark prompting unleashes extraordinary visual grounding in gpt-4v")); Qian et al. ([2024](https://arxiv.org/html/2601.20380v1#bib.bib14 "Visual grounding for user interfaces")); Gou et al. ([2024](https://arxiv.org/html/2601.20380v1#bib.bib17 "Navigating the digital world as humans do: universal visual grounding for gui agents")).

Representative efforts such as SeeClick Cheng et al. ([2024](https://arxiv.org/html/2601.20380v1#bib.bib4 "Seeclick: harnessing gui grounding for advanced visual gui agents")) and subsequent grounding-oriented models Zhang et al. ([2024](https://arxiv.org/html/2601.20380v1#bib.bib15 "Mm1.5: methods, analysis & insights from multimodal llm fine-tuning")); Qian et al. ([2024](https://arxiv.org/html/2601.20380v1#bib.bib14 "Visual grounding for user interfaces")); Nguyen ([2024](https://arxiv.org/html/2601.20380v1#bib.bib18 "Improved gui grounding via iterative narrowing")); Lin et al. ([2025](https://arxiv.org/html/2601.20380v1#bib.bib16 "Showui: one vision-language-action model for gui visual agent")) demonstrated the feasibility of instruction-conditioned UI localization, but also revealed strong sensitivity to screen resolution, layout diversity, and domain shift. To better characterize these challenges, several benchmarks have been proposed. ScreenSpot Cheng et al. ([2024](https://arxiv.org/html/2601.20380v1#bib.bib4 "Seeclick: harnessing gui grounding for advanced visual gui agents")) introduced cross-platform grounding evaluation across mobile, web, and desktop interfaces, while ScreenSpot-V2 Wu et al. ([2024](https://arxiv.org/html/2601.20380v1#bib.bib35 "OS-atlas: a foundation action model for generalist gui agents")) improves upon ScreenSpot by revising and correcting its original annotations. Follow-up datasets such as ScreenSpot-Pro Li et al. ([2025](https://arxiv.org/html/2601.20380v1#bib.bib19 "Screenspot-pro: gui grounding for professional high-resolution computer use")) further emphasize small targets and professional workflows.

Subsequent strong baselines, often reused across later agent studies, include OS-Atlas Wu et al. ([2024](https://arxiv.org/html/2601.20380v1#bib.bib35 "OS-atlas: a foundation action model for generalist gui agents")), Aguvis Xu et al. ([2024](https://arxiv.org/html/2601.20380v1#bib.bib2 "Aguvis: unified pure vision agents for autonomous gui interaction")), and UGround Qian et al. ([2025](https://arxiv.org/html/2601.20380v1#bib.bib6 "UGround: towards unified visual grounding with unrolled transformers")). Together, these works demonstrate that GUI grounding performance remains highly sensitive to resolution, layout diversity, and distribution shift. More recent work explores reinforcement-learning-style post-training for UI grounding, in which rewards directly reflect spatial correctness to improve generalization and reduce dependence on dense annotations. Examples include UI-R1 Lu et al. ([2025](https://arxiv.org/html/2601.20380v1#bib.bib51 "UI-r1: enhancing efficient action prediction of gui agents by reinforcement learning")), GUI-R1 Luo et al. ([2025a](https://arxiv.org/html/2601.20380v1#bib.bib60 "Gui-r1: a generalist r1-style vision-language action model for gui agents")), InfiGUI-R1 Liu et al. ([2025](https://arxiv.org/html/2601.20380v1#bib.bib59 "Infigui-r1: advancing multimodal gui agents from reactive actors to deliberative reasoners")), and coordinate-free grounding approaches such as GUI-Actor Wu et al. ([2025](https://arxiv.org/html/2601.20380v1#bib.bib49 "GUI-actor: coordinate-free visual grounding for gui agents")). Related variants investigate reward modeling and policy optimization strategies tailored to GUI grounding, including GUI-G2 Tang et al. ([2025a](https://arxiv.org/html/2601.20380v1#bib.bib42 "GUI-g2: gaussian reward modeling for gui grounding")) and InfiGUI-G1 Liu et al. ([2025](https://arxiv.org/html/2601.20380v1#bib.bib59 "Infigui-r1: advancing multimodal gui agents from reactive actors to deliberative reasoners")).

### 2.2  GUI Agent Architectures: Modular Pipelines vs. Native Agents

Early and many contemporary GUI agents adopt _modular architectures_, decomposing the overall problem into separate components for perception, planning, memory, and execution. Agent-S Agashe et al. ([2024](https://arxiv.org/html/2601.20380v1#bib.bib21 "Agent s: an open agentic framework that uses computers like a human")), Agent-S3 Gonzalez-Pumariega et al. ([2025](https://arxiv.org/html/2601.20380v1#bib.bib69 "The unreasonable effectiveness of scaling agents for computer use")) and Cradle Tan et al. ([2024](https://arxiv.org/html/2601.20380v1#bib.bib20 "Cradle: empowering foundation agents towards general computer control")) exemplify framework-centric designs that leverage a strong foundation model for planning and reflection, while relying on explicit modules such as prompted planners, memory buffers, verifiers, and tool wrappers to improve controllability and interpretability. Mobile-Agent Wang et al. ([2024b](https://arxiv.org/html/2601.20380v1#bib.bib23 "Mobile-agent: autonomous multi-modal mobile device agent with visual perception"), [a](https://arxiv.org/html/2601.20380v1#bib.bib70 "Mobile-agent-v2: mobile device operation assistant with effective navigation via multi-agent collaboration")); Ye et al. ([2025](https://arxiv.org/html/2601.20380v1#bib.bib71 "Mobile-agent-v3: fundamental agents for gui automation")) follows a similar decomposition for mobile environments, using vision-based perception to reduce reliance on platform metadata. OS-Symphony Yang et al. ([2026](https://arxiv.org/html/2601.20380v1#bib.bib72 "OS-symphony: a holistic framework for robust and generalist computer-using agent")) and GTA1 Yang et al. ([2025a](https://arxiv.org/html/2601.20380v1#bib.bib55 "Gta1: gui test-time scaling agent")) both advance computer-using agent frameworks by improving robustness and generalization for GUI-based tasks through careful system design and enhanced inference-time scaling. A common pattern in these systems is to incorporate strong grounding models and optionally UI parsers, such as OmniParser Wan et al. ([2024](https://arxiv.org/html/2601.20380v1#bib.bib73 "Omniparser: a unified framework for text spotting key information extraction and table recognition")), to obtain structured UI representations for downstream planning. However, modular pipelines are prone to error accumulation across components and often require extensive hand engineering to support diverse applications and long-horizon tasks.

In contrast, recent work has increasingly shifted toward _native_ or _end-to-end GUI agents_, which unify perception, reasoning, and action within a single model. AutoWebGLM Lai et al. ([2024](https://arxiv.org/html/2601.20380v1#bib.bib77 "Autowebglm: a large language model-based web navigating agent")) and UI-TARS Qin et al. ([2025](https://arxiv.org/html/2601.20380v1#bib.bib12 "Ui-tars: pioneering automated gui interaction with native agents")) frame this shift as analogous to end-to-end tool-using agents, arguing that unified policies can more effectively leverage large-scale data and reinforcement-learning signals. AutoGLM Liu et al. ([2024](https://arxiv.org/html/2601.20380v1#bib.bib78 "Autoglm: autonomous foundation agents for guis")) introduces an intermediate interface to decouple planning from grounding and proposes a progressive, self-evolving online curriculum reinforcement-learning framework for web and mobile GUI control. UI-TARS-2 Wang et al. ([2025a](https://arxiv.org/html/2601.20380v1#bib.bib11 "Ui-tars-2 technical report: advancing gui agent with multi-turn reinforcement learning")) further emphasizes _multi-turn reinforcement learning_ as a key driver of performance gains, enabling agents to optimize long-horizon behavior and recover from intermediate errors. AgentCPM-GUI Zhang et al. ([2025b](https://arxiv.org/html/2601.20380v1#bib.bib43 "AgentCPM-gui: building mobile-use agents with reinforcement fine-tuning")) targets efficient on-device mobile GUI interaction by introducing a compact action space and a three-stage training pipeline. Step-GUI Yan et al. ([2025](https://arxiv.org/html/2601.20380v1#bib.bib74 "Step-gui technical report")) proposes a self-evolving training pipeline and couples it with a hierarchical GUI-MCP protocol to enable standardized, privacy-preserving execution across heterogeneous devices. OpenCUA Wang et al. ([2025b](https://arxiv.org/html/2601.20380v1#bib.bib50 "Opencua: open foundations for computer-use agents")) provides open foundations for computer-use agents, including datasets, evaluation protocols, and strong baselines. Mano Fu et al. ([2025](https://arxiv.org/html/2601.20380v1#bib.bib75 "Mano technical report")) investigates training strategies and system designs for general computer use, including iterative improvement and evaluation-oriented components that bridge framework-based approaches and end-to-end policy learning. UI-Venus Gu et al. ([2025](https://arxiv.org/html/2601.20380v1#bib.bib1 "Ui-venus technical report: building high-performance ui agents with rft")) further highlights the central role of data quality and trajectory curation in driving performance gains. MAI-UI Zhou et al. ([2025a](https://arxiv.org/html/2601.20380v1#bib.bib76 "MAI-ui technical report: real-world centric foundation gui agents")) explicitly emphasizes deployment considerations, including agent–user interactive operation and MCP-augmented tool use. Although these methods enable implicit planning and memory to emerge from multi-step trajectory training, they also introduce challenges in training stability and environment scalability.

## 3  Methodology

Our training paradigm uses a decoupled design with two specialized models: (i) a grounding model for high-precision visual perception and (ii) a navigation model for sequential decision-making. Figure [2](https://arxiv.org/html/2601.20380v1#S3.F2 "Figure 2 ‣ 3.1 OmegaUse-G: Foundation of Visual Perception ‣ 3 Methodology ‣ OmegaUse: Building a General-Purpose GUI Agent for Autonomous Task Execution") illustrates the overall framework architecture. This separation enables targeted optimization and reduces interference between low-level spatial grounding and high-level reasoning.

### 3.1  OmegaUse-G: Foundation of Visual Perception

The grounding model is designed to map textual queries to precise spatial coordinates on the UI. We first describe the data construction process for the grounding model and then present the corresponding training strategy.

![Refer to caption](x2.png)

Figure 2: The overall architecture of the OmegaUse framework. The pipeline proceeds through four distinct layers: (1) a hybrid data processing stage integrating automated LLM-assisted annotation and human-in-the-loop refinement; (2) SFT of an MoE foundation model; (3) decoupled RL using GRPO with tailored rewards for grounding and navigation tasks; and (4) final deployment of the optimized agents across diverse application environments.

#### 3.1.1 Grounding Data Pipeline

We aggregated a diverse GUI grounding corpus by consolidating six publicly available datasets: Aguvis Xu et al. ([2024](https://arxiv.org/html/2601.20380v1#bib.bib2 "Aguvis: unified pure vision agents for autonomous gui interaction")), UI RefExp Bai et al. ([2021](https://arxiv.org/html/2601.20380v1#bib.bib3 "Uibert: learning generic multimodal representations for ui understanding")), Widget Captioning Li et al. ([2020](https://arxiv.org/html/2601.20380v1#bib.bib5 "Widget captioning: generating natural language description for mobile user interface elements")), SeeClick Cheng et al. ([2024](https://arxiv.org/html/2601.20380v1#bib.bib4 "Seeclick: harnessing gui grounding for advanced visual gui agents")), Uground Qian et al. ([2025](https://arxiv.org/html/2601.20380v1#bib.bib6 "UGround: towards unified visual grounding with unrolled transformers")), and OS-Atlas Wu et al. ([2024](https://arxiv.org/html/2601.20380v1#bib.bib35 "OS-atlas: a foundation action model for generalist gui agents")). As summarized in Table 1, these sources provide a comprehensive coverage of mobile, web, and desktop interfaces. The combined raw pool contains approximately 1.66 million instances.

Table 1: Statistics of the GUI grounding datasets used in our study. The raw pool of 1.66M instances was distilled into a 111k high-quality training set.

Dataset

Platform

Raw Samples

Aguvis

Mobile

110k

UI RefExp

Mobile

16k

Widget Captioning

Mobile

40k

SeeClick

Web

250k

Uground

Web

750k

OS-Atlas

Desktop

490k

Total Raw Pool

\-

1.66M

Final Sampled Set

Mixed

111k

Despite the large scale of existing open-source datasets, we observe that nearly 40% of raw instances contain substantial noise, including misaligned bounding boxes and ambiguous textual prompts. These issues are particularly prevalent in datasets whose labels are automatically extracted from HTML or accessibility trees, where rendering offsets frequently introduce spatial inaccuracies. Prior studies Gu et al. ([2025](https://arxiv.org/html/2601.20380v1#bib.bib1 "Ui-venus technical report: building high-performance ui agents with rft")) have shown that data quality critically affects grounding performance, and fully automated filtering methods often struggle to reliably identify high-quality examples.

To address these bottlenecks, we employed a manual inspection and correction pipeline. We first eliminate redundant or overly simplistic samples, followed by downsampling to retain 300K instances. Subsequently, we manually realign shifted bounding boxes and rephrase ambiguous or meaningless instructions to enforce a precise one-to-one correspondence between visual elements and their textual descriptions. Besides, samples containing blurred images or inherently ambiguous instructions are strictly filtered out. This rigorous refinement process yields a curated dataset of 111K high-quality samples, ensuring that the model is trained with reliable supervision signals.

#### 3.1.2 Two-Stage Grounding Training

To optimize the spatial reasoning and localization precision of our model, we adopt a hierarchical training paradigm using the manually refined grounding dataset. We partition the dataset into a transition from foundational coordinate formatting to high-precision reinforcement refinement.

(1) Policy Initialization (SFT): In the first stage, we perform SFT to establish the fundamental capability of the model to interpret instructions and output spatial coordinates in the standard \[xm​i​n,ym​i​n,xm​a​x,ym​a​x\]\[x\_{min},y\_{min},x\_{max},y\_{max}\] format. This phase ensures that the model masters basic task logic and syntax across mobile, and PC platforms before entering the reinforcement stage.

(2) Reinforcement Learning for Spatial Precision: Building upon the SFT baseline, we employ reinforcement fine-tuning using the GRPO framework. GRPO enhances training stability by estimating baselines through relative rewards within groups, significantly reducing the computational overhead typically associated with a separate critic model. Specifically, for each training prompt qq, GRPO samples a group of GG rollouts {o1,o2,…,oG}\\{o\_{1},o\_{2},...,o\_{G}\\} from the old policy πθo​l​d\\pi\_{\\theta\_{old}}. The advantage A^i\\hat{A}\_{i} for each rollout is computed by normalizing the rewards within the group:

A^i\=ri−mean​({r1,r2,…,rG})std​({r1,r2,…,rG})\\hat{A}\_{i}=\\frac{r\_{i}-\\text{mean}(\\{r\_{1},r\_{2},\\dots,r\_{G}\\})}{\\text{std}(\\{r\_{1},r\_{2},\\dots,r\_{G}\\})}

(1)

The policy is then optimized by maximizing the following objective function:

𝒥G​R​P​O(πθ)\=𝔼q∼𝒬,{oi}i\=1G∼πθo​l​d\[1G∑i\=1G(1|oi|∑t\=1|oi|ℒc​l​i​p(θ)−βDK​L(πθ||πr​e​f))\]\\mathcal{J}\_{GRPO}(\\pi\_{\\theta})=\\mathbb{E}\_{q\\sim\\mathcal{Q},\\{o\_{i}\\}\_{i=1}^{G}\\sim\\pi\_{\\theta\_{old}}}\\left\[\\frac{1}{G}\\sum\_{i=1}^{G}\\left(\\frac{1}{|o\_{i}|}\\sum\_{t=1}^{|o\_{i}|}\\mathcal{L}\_{clip}(\\theta)-\\beta D\_{KL}(\\pi\_{\\theta}||\\pi\_{ref})\\right)\\right\]

(2)

where ℒc​l​i​p​(θ)\\mathcal{L}\_{clip}(\\theta) represents the surrogate objective with a clipping mechanism to prevent excessive policy updates, and the KL divergence term with coefficient β\\beta constrains the policy from diverging from the reference model πr​e​f\\pi\_{ref}. For grounding task, we select a classic dual-component reward function to calibrate the model’s spatial perception Gu et al. ([2025](https://arxiv.org/html/2601.20380v1#bib.bib1 "Ui-venus technical report: building high-performance ui agents with rft")):

1). Format Reward (Rf​m​tR\_{fmt}): A binary reward that validates whether the predicted string conforms to the predefined syntax, ensuring the model outputs executable and parsable responses.

2). Inside-of-Bounding-Box Reward (Rp​o​sR\_{pos}): This reward targets localization accuracy by incentivizing the model to predict a center point (x,y)(x,y) that falls strictly within the ground-truth interactive region \[xm​i​n,ym​i​n,xm​a​x,ym​a​x\]\[x\_{min},y\_{min},x\_{max},y\_{max}\]. The reward is formulated as follows:

Rp​o​s\={1if ​x1≤x≤x2​ and ​y1≤y≤y20otherwiseR\_{pos}=\\begin{cases}1&\\text{if }x\_{1}\\leq x\\leq x\_{2}\\text{ and }y\_{1}\\leq y\\leq y\_{2}\\\\ 0&\\text{otherwise}\\end{cases}

(3)

3). Total Reward Balancing: To synchronize structural correctness with action precision, the final action-wise reward is computed as a weighted combination:

R\=Rf​m​t⋅w1+Rp​o​s⋅w2R=R\_{fmt}\\cdot w\_{1}+R\_{pos}\\cdot w\_{2}

(4)

By carefully balancing the weights w1w\_{1} and w2w\_{2}, we prevent potential reward conflicts where the model might sacrifice format for precision or vice-versa, ultimately leading to a more robust and coherent grounding policy.

### 3.2  OmegaUse: Advanced Planning and Navigation

In this section, we detail the design and training of OmegaUse’s navigation model, thereby operationalizing our high-quality data construction and decoupled training paradigm. We first present a hierarchical navigation data pipeline that integrates three complementary sources: (1) rigorously curated open-source datasets, (2) automatically synthesized trajectories via bottom-up autonomous exploration and top-down taxonomy-guided generation, and (3) high-fidelity cross-terminal expert demonstrations. We then describe a two-stage optimization strategy, consisting of SFT to establish foundational interaction syntax and task logic, followed by GRPO with specialized reward designs to refine spatial grounding and sequential decision-making.

#### 3.2.1 Unified Action Space

To ensure consistent navigation across diverse platforms, we propose a unified action space that standardizes interaction primitives across mobile, desktop, and web platforms. This design organizes agent operations hierarchically, with a core set of shared actions for universal GUI interaction and platform-specific extensions tailored to the unique affordances of each terminal.

As detailed in Table [2](https://arxiv.org/html/2601.20380v1#S3.T2 "Table 2 ‣ 3.2.1 Unified Action Space ‣ 3.2 OmegaUse: Advanced Planning and Navigation ‣ 3 Methodology ‣ OmegaUse: Building a General-Purpose GUI Agent for Autonomous Task Execution"), the shared primitives establish a cross-platform baseline (e.g., click, drag, and type), while specialized actions address terminal-unique requirements—such as desktop hotkeys or mobile system gestures. By harmonizing these disparate operational schemas into a single cohesive space, the model achieves robust cross-terminal generalization. When synchronized with our hierarchical task taxonomy, this architecture enables the agent to execute complex trajectories with unified logical reasoning regardless of the underlying digital ecosystem.

Table 2: Unified Action Space Of OmegaUse Across Different Platforms.

Platform

Action Schema

Functional Definition

\\rowcolor\[gray\]0.95

Click(box=(x, y))

Performs a single-tap or left-click at the given coordinates.

\\rowcolor\[gray\]0.95

Drag(start, end)

Executes a drag-and-drop sequence from start point (x1, y1) to end point (x2, y2).

\\rowcolor\[gray\]0.95

Scroll(start, end, dir)

Scrolls from (x1, y1) to (x2, y2) in the given direction.

\\rowcolor\[gray\]0.95

Type(content=‘’)

Injects the specified text string into the active input focus.

\\rowcolor\[gray\]0.95

Wait()

Suspends execution to allow for UI state synchronization.

\\rowcolor\[gray\]0.95 Shared

Finished(content=‘’)

Terminates the task and returns the final result.

Hotkey(key=\[‘’, …\])

Simulates hardware keyboard combinations.

LeftDouble(box=(x, y))

Executes a double-click at (x, y).

Desktop

RightSingle(box=(x, y))

Executes a right-click at (x, y).

\\rowcolor\[gray\]0.95

Hover(box=(x, y))

Moves the mouse cursor to a specific point.

\\rowcolor\[gray\]0.95 Web

BrowserStop()

Interrupts the current page loading process.

LongPress(box=(x, y))

Long presses at (x, y).

PressBack()

Navigates to the previous screen.

PressHome()

Returns the device to the primary home screen.

Mobile

PressEnter()

Presses the “enter” key.

#### 3.2.2 Hierarchical Navigation Data Pipeline

To bridge the gap between low-level visual perception and high-level logical planning, we construct a large-scale, multi-platform navigation dataset using a hierarchical three-pronged approach: (1) rigorous curation of open-source data, (2) automated trajectory synthesis in virtual sandboxes, and (3) high-fidelity expert demonstrations across multiple terminals.

(1) Open-source Data Curation and Auditing: We leverage the AGUVIS Xu et al. ([2024](https://arxiv.org/html/2601.20380v1#bib.bib2 "Aguvis: unified pure vision agents for autonomous gui interaction")) stage-2 collection to construct our foundational interaction dataset, which aggregates a diverse array of GUI execution trajectories from both mobile and web terminals, such as AITW Rawles et al. ([2023](https://arxiv.org/html/2601.20380v1#bib.bib38 "Androidinthewild: a large-scale dataset for android device control")) and Mind2Web Deng et al. ([2023](https://arxiv.org/html/2601.20380v1#bib.bib25 "Mind2web: towards a generalist agent for the web")). However, these open-source datasets frequently suffer from significant noise, including misaligned coordinates and fragmented action chains, which can adversely impact model performance if utilized directly. To mitigate these issues Gu et al. ([2025](https://arxiv.org/html/2601.20380v1#bib.bib1 "Ui-venus technical report: building high-performance ui agents with rft")), we implement a two-stage quality control pipeline:

Initially, we apply rule-based filtering to eliminate obvious noise and uninformative samples. This involves: (i) enforcing a minimum trajectory length threshold (e.g., \>3\>3 steps) to ensure the presence of sufficient learning signals; and (ii) detecting and discarding trajectories characterized by redundant or repetitive action patterns, which typically indicate agent stalling or unproductive exploration.

Subsequently, we employ MLLMs as a high-level trajectory auditor to perform task-completion verification. For each candidate trajectory, the auditor is provided with the specific user goal and the complete execution trace, which includes step-wise action descriptions paired with their corresponding UI screenshots. By jointly analyzing the linguistic intent of the actions and the visual state transitions, the model judges whether the sequence of operations successfully fulfills the original task. Trajectories identified as incomplete or logically inconsistent are strictly filtered out.

(2) Automated Trajectory Synthesis: To expand the diversity and robustness of our navigation dataset, we implement an automated synthesis framework within simulation environments. We utilize two complementary strategies to balance dataset coverage and task complexity: an Exploration-driven (Bottom-up) approach for autonomous UI discovery, and a Taxonomy-guided (Top-down) approach for generating sophisticated tasks based on expert knowledge.

![Refer to caption](x3.png)

Figure 3: Overview of the Exploration-driven (Bottom-up) data construction pipeline. (a) Triples Collection: Gathering raw interaction primitives <pre\_state,action,post\_state\><pre\\\_state,action,post\\\_state> through autonomous application exploration. (b) State Transition Graph Construction: Organizing interaction traces into a structured graph with MLLM-based semantic clustering to merge redundant UI states. (c) Trajectory Extraction: Sampling diverse execution paths while enriching them with natural language task goals and step-wise action interpretations.

Exploration-driven Synthesis (Bottom-up): To overcome the critical challenges of designing realistic task goals and obtaining diverse execution paths, we implement a systematic bottom-up data construction pipeline as illustrated in Figure [3](https://arxiv.org/html/2601.20380v1#S3.F3 "Figure 3 ‣ 3.2.2 Hierarchical Navigation Data Pipeline ‣ 3.2 OmegaUse: Advanced Planning and Navigation ‣ 3 Methodology ‣ OmegaUse: Building a General-Purpose GUI Agent for Autonomous Task Execution"). This approach automates high-quality data generation through a four-stage process: interaction exploration, state aggregation, trajectory extraction, and semantic enrichment. Taking the mobile environment as an example, we employ a Depth-First Search (DFS) strategy to explore individual applications within a simulator Li et al. ([2017](https://arxiv.org/html/2601.20380v1#bib.bib68 "Droidbot: a lightweight ui-guided test input generator for android")). By interacting with UI elements parsed from the Accessibility Tree, the agent collects raw interaction samples in the form of triples: <pre\_state,action,post\_state\><pre\\\_state,action,post\\\_state>. Each state is captured as a screenshot, while actions describe specific user behaviors such as clicking or text input. A unique identification and hashing mechanism based on UI structures and action encoding is utilized to avoid redundant exploration of historical states.

To organize these exploration traces into a structured framework, we construct a state transition graph, where each node represents a unique UI state and each directed edge denotes a specific action leading from one state to another. Recognizing the potential for structural redundancy in raw graphs, we introduce a MLLMs-based state clustering and compression mechanism. MLLMs are utilized to perform semantic understanding of screenshots, enabling the system to judge whether multiple nodes belong to the same functional page, such as “Settings” pages with minor visual variations. These redundant nodes are merged into virtual nodes to reduce the graph scale and significantly improve subsequent computational efficiency.

Based on the refined state transition graph, we perform trajectory extraction by enumerating multiple reachable paths from the initial state. To ensure the logical coherence of the generated data, we implement a cycle-avoidance strategy that maintains a visit set for each path, skipping branches that would lead to unproductive UI loops, such as “Settings →\\rightarrow Back →\\rightarrow Settings”. Following trajectory extraction, we utilize MLLMs for semantic enrichment at two levels: action interpretation and task goal generation. Each triple is translated into a natural language description, such as “Click the ‘Settings’ button in the top right corner”, while the entire action sequence is abstracted into a coherent task objective, like “Modify notification permissions in the settings menu”. This mapping from execution trajectories to high-level linguistic goals provides the core supervision signal required to train the agent for robust instruction-to-action generation.

Taxonomy-guided Generation (Top-down): We propose a taxonomy-guided generation framework and apply it across desktop and mobile environments to ensure comprehensive coverage of diverse real-world interaction behaviors. For each kind of environment, we design a specialized hierarchical task taxonomy grounded in its unique ecosystem and typical usage patterns. Guided by these taxonomies, task descriptions are generated and subsequently executed by a high-capability expert model within our unified simulation environments. The agent performs self-assessment of execution correctness based on real-time environmental feedback, and trajectories with successful outcomes are recorded as candidate samples. As a representative instance, Table [3](https://arxiv.org/html/2601.20380v1#S3.T3 "Table 3 ‣ 3.2.2 Hierarchical Navigation Data Pipeline ‣ 3.2 OmegaUse: Advanced Planning and Navigation ‣ 3 Methodology ‣ OmegaUse: Building a General-Purpose GUI Agent for Autonomous Task Execution") shows a hierarchical taxonomy developed for typical daily GUI usage patterns in a desktop environment.

To ensure annotation reliability, we build a human-in-the-loop verification platform in which human annotators verify cases that the model has labeled as successful. This design reduces noise, prevents the accumulation of errors from automatic labeling, and improves the overall robustness of the dataset. In addition, we collect two types of failure cases: (i) those that LLM itself judges as unsuccessful and (ii) those it incorrectly judges as successful. These model-generated failure cases are then handed over to human annotators for careful relabeling, resulting in a curated diagnostic failure subset of challenging GUI tasks that even state-of-the-art closed-source models such as LLM fail to solve.

(3) Cross-Terminal Expert Demonstrations: To establish a high-quality data for the navigation model, we also implement an expert demonstration pipeline for desktop and mobile environments.

Based on the hierarchical taxonomies established for each terminal, we utilize LLMs to synthesize task instructions through divergent reasoning. To ensure task depth and challenge, we enforce a strict complexity constraint, requiring each instruction to involve at least five operational steps. Before the annotation phase, human experts manually vet these prompts for logical validity and environmental feasibility, refining or discarding any substandard entries to ensure a high-quality instruction pool.

The verified instructions are subsequently distributed to our proprietary annotation platform, where professional annotators perform step-by-step executions within simulation environments until task completion. This process ensures that the resulting trajectories capture precise state transitions and aligned action sequences.

To guarantee maximum data reliability, we implement a two-tier quality assurance protocol where each completed trajectory must undergo independent audit by two inspectors. Only samples passing both goal alignment and logical consistency checks are finally retained, resulting in a high-fidelity expert demonstration dataset that serves as a robust foundation for model training and benchmarking.

Table 3: Hierarchical task taxonomy for desktop GUI Navigation. This taxonomy guides the top-down generation process to ensure a diverse coverage of real-world user scenarios.

Domain

Core Functionalities and Sub-scenarios

\\rowcolor\[gray\]0.95 Desktop Office

Document Editing, Spreadsheet Processing, Presentation Creation, PDF Workflows, Collaboration & Sharing.

Browser & Web

Tab Management, Privacy & Security, Browser Extensions, Account Sync, Developer Tools.

\\rowcolor\[gray\]0.95 Communication

Instant Messaging, Meetings & Remote Collaboration, Email, Calendar Integration.

File Management

Search & Indexing, Compression, Archive Management, Storage Sync, External Media Operations.

\\rowcolor\[gray\]0.95 System Operations

Display & Device Settings, Network Connectivity, Power & Updates, Software Management, Notifications & Focus.

Media & Ent.

Image Editing, Media Playback, Content Library Management.

\\rowcolor\[gray\]0.95 DevOps & Tech

Development Environments, Version Control, System Technical Operations, Deployment.

Productivity Tools

Screen Capture, Notes & Tasks, Calculator, Time Management, Desktop Enhancements.

\\rowcolor\[gray\]0.95 Security & Privacy

Account Access Security, System Protection, Encryption, Privacy Shielding.

#### 3.2.3 Two-Stage Navigation Training

To develop a robust GUI navigation agent capable of complex multi-step planning, we implement a two-stage optimization paradigm. This strategy leverages a massive initial corpus for general behavioral alignment followed by high-precision reinforcement learning on expert-verified data.

(1) Policy Initialization (SFT): The navigation model is first trained using SFT on a diverse dataset of approximately 260​K260K instances. This corpus consists of aggregated open-source navigation traces and automatically synthesized trajectories. This stage focuses on teaching the model the fundamental mapping between linguistic goals and cross-platform action sequences, establishing a stable starting policy that adheres to the unified action space.

At each step tt, the agent receives the multimodal input Xt\={I,Vt,Ht}X\_{t}=\\{I,V\_{t},H\_{t}\\}, where II is the task instruction, VtV\_{t} is the current screenshot, and HtH\_{t} represents the historical reasoning traces. The agent’s response is structured as a triplet Yt\=(Ot,Tt,At)Y\_{t}=(O\_{t},T\_{t},A\_{t}): the observation OtO\_{t} semantically describes the UI state; the thought TtT\_{t} performs goal-oriented reasoning based on II; and the action AtA\_{t} provides the executable code snippet conforming to our unified action space. This O→T→AO\\rightarrow T\\rightarrow A pipeline ensures each action is grounded in explicit perception and logical planning.

(2) Reinforcement Learning for Decision Robustness: Based on the SFT baseline, we also employ reinforcement learning using the GRPO framework. To provide the fine-grained feedback, we design a multi-dimensional reward function that assesses both structural integrity and operational logic:

1). Format Reward (Rf​m​tR\_{fmt}): This reward validates whether the output strictly conforms to the required template, ensuring reasoning and actions are correctly enclosed within structured tags.

2). Action-wise Reward (Ra​c​tR\_{act}): This component evaluates the execution logic and is further decomposed into:

*   •
    
    Type Accuracy (Rt​y​p​eR\_{type}): A binary reward for matching the correct action primitive (e.g., Click vs. Scroll).
    
*   •
    
    Coordinate Precision (Rc​o​o​r​dR\_{coord}): For spatial actions, we apply a stepwise reward based on the distance between the predicted and ground-truth coordinates:
    
    Rc​o​o​r​d\={1.0if ​Δ​x,Δ​y<θ1,0.5if ​θ1≤Δ​x,Δ​y<θ2,0otherwise.R\_{coord}=\\begin{cases}1.0&\\text{if }\\Delta x,\\Delta y<\\theta\_{1},\\\\ 0.5&\\text{if }\\theta\_{1}\\leq\\Delta x,\\Delta y<\\theta\_{2},\\\\ 0&\\text{otherwise.}\\end{cases}
    
    (5)
    
    where Δ​x\=|xp​r​e​d−xg​t|\\Delta x=|x\_{pred}-x\_{gt}| and Δ​y\=|yp​r​e​d−yg​t|\\Delta y=|y\_{pred}-y\_{gt}| denote the absolute differences between the predicted coordinates and the ground truth along the xx and yy axes, respectively. The parameters θ1\\theta\_{1} and θ2\\theta\_{2} serve as predefined distance thresholds that determine the precision of the agent’s spatial grounding during coordinate-based actions such as Click or LeftDouble.
    
    For the Drag action, the reward RdragR\_{\\text{drag}} is calculated based on the coordinate deviations of both the start and end points:
    
    Rd​r​a​g\={1.0if ​max⁡(Δ​x1,Δ​y1,Δ​x2,Δ​y2)≤α10.5if ​α1<max⁡(Δ​x1,Δ​y1,Δ​x2,Δ​y2)≤α20otherwiseR\_{{drag}}=\\begin{cases}1.0&\\text{if }\\max(\\Delta x\_{1},\\Delta y\_{1},\\Delta x\_{2},\\Delta y\_{2})\\leq\\alpha\_{1}\\\\ 0.5&\\text{if }\\alpha\_{1}<\\max(\\Delta x\_{1},\\Delta y\_{1},\\Delta x\_{2},\\Delta y\_{2})\\leq\\alpha\_{2}\\\\ 0&\\text{otherwise}\\end{cases}
    
    (6)
    
    where Δ​xi\=|xi,pred−xi,gt|\\Delta x\_{i}=|x\_{i,\\text{pred}}-x\_{i,\\text{gt}}| and Δ​yi\=|yi,pred−yi,gt|\\Delta y\_{i}=|y\_{i,\\text{pred}}-y\_{i,\\text{gt}}| represent the absolute errors for the start (i\=1i=1) and end (i\=2i=2) coordinates.
    
    For the Scroll action, the reward RscrollR\_{\\text{scroll}} incorporates both spatial precision and directional accuracy:
    
    Rs​c​r​o​l​l\={1.0if ​max⁡(Δ​x1,Δ​y1,Δ​x2,Δ​y2)≤β1​, and dirpred\=dirgt0.5if ​β1<max⁡(Δ​x1,Δ​y1,Δ​x2,Δ​y2)≤β2​ ,and dirpred\=dirgt0otherwiseR\_{{scroll}}=\\begin{cases}1.0&\\text{if }\\max(\\Delta x\_{1},\\Delta y\_{1},\\Delta x\_{2},\\Delta y\_{2})\\leq\\beta\_{1}\\text{, and }\\text{dir}\_{\\text{pred}}=\\text{dir}\_{\\text{gt}}\\\\ 0.5&\\text{if }\\beta\_{1}<\\max(\\Delta x\_{1},\\Delta y\_{1},\\Delta x\_{2},\\Delta y\_{2})\\leq\\beta\_{2}\\text{ ,and }\\text{dir}\_{\\text{pred}}=\\text{dir}\_{\\text{gt}}\\\\ 0&\\text{otherwise}\\end{cases}
    
    (7)
    
    where dirpred\\text{dir}\_{\\text{pred}} and dirgt\\text{dir}\_{\\text{gt}} denote the predicted and ground-truth scroll directions. This formulation ensures the agent’s scrolling behavior is both spatially grounded and semantically correct.
    
*   •
    
    Content Fidelity (Rc​o​n​t​e​n​tR\_{content}): For typing tasks, the reward is determined by the token-level F1-score of the predicted string S1S\_{1} relative to the ground-truth target S2S\_{2}
    
    Rc​o​n​t​e​n​t\={1.0if F1-score≥0.5,0otherwise.R\_{content}=\\begin{cases}1.0&\\text{if F1-score}\\geq 0.5,\\\\ 0&\\text{otherwise.}\\end{cases}
    
    (8)
    
    For the Hotkey action, the reward RhotkeyR\_{\\text{hotkey}} is defined by a binary matching criterion, requiring the predicted key combination to be identical to the ground truth:
    
    Rh​o​t​k​e​y\={1.0if ​Kpred\=Kgt,0otherwise.R\_{hotkey}=\\begin{cases}1.0&\\text{if }K\_{\\text{pred}}=K\_{\\text{gt}},\\\\ 0&\\text{otherwise.}\\end{cases}
    
    (9)
    
    where KpredK\_{\\text{pred}} and KgtK\_{\\text{gt}} represent the predicted and ground-truth hotkey parameter sets (e.g., \[‘ctrl’, ‘c’\]). Given that hotkey operations are sensitive to exact key combinations, this strict matching ensures the agent executes the precise system-level command intended.
    

3). Total Reward Balancing: The final reward for each step is a weighted sum that balances structural consistency with action accuracy:

R\=Rf​m​t⋅w3+Ra​c​t⋅w4R=R\_{fmt}\\cdot w\_{3}+R\_{act}\\cdot w\_{4}

(10)

where w3w\_{3} and w4w\_{4} are hyper-parameters tuned to prevent the model from sacrificing action precision for format compliance or vice-versa.

## 4  Offline Benchmarks for Real-World GUI Navigation

To facilitate evaluation of agent performance in realistic digital environments, we introduce OS-Nav, a specialized offline benchmark comprising two sub-benchmarks across different operating systems: ChiM-Nav, focusing on Chinese Android mobile systems, and Ubu-Nav, targeting routine desktop interactions on Ubuntu. The benchmark is open-sourced, and can be publicly accessed 333https://huggingface.co/datasets/baidu-frontier-research/OS-Nav.

To ensure the reliability of state transitions and the transparency of agent logic, both benchmarks were developed using a rigorous human-AI collaborative pipeline. We curated expert-labeled execution traces to ensure all tasks reflect authentic user behavior. For every step, we utilized MLLMs to synthesize intermediate CoT descriptions, providing a semantic bridge between linguistic goals and raw actions. Every trajectory, including the AI-generated reasoning, underwent final refinement by human experts to ensure the “gold” labels are logically sound and environment-feasible.

### 4.1  ChiM-Nav: Chinese Mobile Navigation Benchmark

The ChiM-Nav benchmark assesses an agent’s ability to navigate popular applications within the Chinese mobile ecosystem. This suite comprises 142 trajectories across 69 distinct applications, totaling 991 operational steps. With an average trajectory length of 6.98 steps, the benchmark emphasizes daily usage scenarios and evaluates the agent’s robustness against the unique UI layouts and multi-step workflows characteristic of Chinese digital platforms.

### 4.2  Ubu-Nav: General Desktop Navigation Benchmark

The Ubu-Nav benchmark consists of 101 trajectories with a total of 641 steps, targeting agent performance in Ubuntu environments. Trajectories in this benchmark range from 2 to 11 steps, with an average length of 6.35 steps per task. It covers extensive routine desktop operations and typical system interactions, focusing on the multi-step reasoning required for common PC tasks.

## 5  Experiments

In this section, we evaluate OmegaUse on a set of grounding and navigation benchmarks across mobile and desktop platforms. Our experiments validate the contributions of our high-quality data construction pipeline, the decoupled training strategy, and cross-terminal generalization on OS-Nav.

Table 4: Performance comparison on ScreenSpot-V2 dataset. The Avg. column represents the overall success rate across all categories.

Models

Mobile

Desktop

Web

Avg

Text

Icon/Widget

Text

Icon/Widget

Text

Icon/Widget

\\rowcolor\[gray\]0.95     Closed-source Models

GPT-4o Islam and Moushi ([2025](https://arxiv.org/html/2601.20380v1#bib.bib56 "Gpt-4o: the cutting-edge advancement in multimodal llm"))

26.6

24.2

24.2

19.3

12.8

11.8

20.1

UI-TARS-1.5 Seed ([2025](https://arxiv.org/html/2601.20380v1#bib.bib46 "UI-tars-1.5"))

\-

\-

\-

\-

\-

\-

94.2

Seed1.5-VL Guo et al. ([2025](https://arxiv.org/html/2601.20380v1#bib.bib47 "Seed1. 5-vl technical report"))

\-

\-

\-

\-

\-

\-

95.2

\\rowcolor\[gray\]0.95     GUI-specific Models (SFT)

SeeClick-9.6B Cheng et al. ([2024](https://arxiv.org/html/2601.20380v1#bib.bib4 "Seeclick: harnessing gui grounding for advanced visual gui agents"))

78.4

50.7

70.1

29.3

55.2

32.5

55.1

ShowUI-2B Lin et al. ([2025](https://arxiv.org/html/2601.20380v1#bib.bib16 "Showui: one vision-language-action model for gui visual agent"))

92.1

75.4

78.9

78.9

84.2

61.1

77.3

UGround-7B Qian et al. ([2025](https://arxiv.org/html/2601.20380v1#bib.bib6 "UGround: towards unified visual grounding with unrolled transformers"))

75.1

84.5

85.1

61.4

84.6

71.9

76.3

OS-Atlas-7B Wu et al. ([2024](https://arxiv.org/html/2601.20380v1#bib.bib35 "OS-atlas: a foundation action model for generalist gui agents"))

95.2

75.8

90.7

63.6

90.6

77.3

84.1

Aguvis-7B Xu et al. ([2024](https://arxiv.org/html/2601.20380v1#bib.bib2 "Aguvis: unified pure vision agents for autonomous gui interaction"))

89.3

68.7

80.6

67.9

89.3

70.0

80.5

UI-TARS-7B Qin et al. ([2025](https://arxiv.org/html/2601.20380v1#bib.bib12 "Ui-tars: pioneering automated gui interaction with native agents"))

96.9

89.1

95.4

85.0

93.6

85.2

91.6

UI-TARS-72B Qin et al. ([2025](https://arxiv.org/html/2601.20380v1#bib.bib12 "Ui-tars: pioneering automated gui interaction with native agents"))

94.8

86.3

91.2

87.9

91.5

87.7

90.3

JEDI-7B Xie et al. ([2025](https://arxiv.org/html/2601.20380v1#bib.bib48 "Scaling computer-use grounding via user interface decomposition and synthesis"))

96.9

87.2

95.9

87.9

94.4

84.2

91.7

GUI-Actor-7B Wu et al. ([2025](https://arxiv.org/html/2601.20380v1#bib.bib49 "GUI-actor: coordinate-free visual grounding for gui agents"))

97.6

88.2

96.9

85.7

93.2

86.7

92.1

OpenCUA-7B Wang et al. ([2025b](https://arxiv.org/html/2601.20380v1#bib.bib50 "Opencua: open foundations for computer-use agents"))

\-

\-

\-

\-

\-

\-

92.3

OpenCUA-32B Wang et al. ([2025b](https://arxiv.org/html/2601.20380v1#bib.bib50 "Opencua: open foundations for computer-use agents"))

\-

\-

\-

\-

\-

\-

93.4

\\rowcolor\[gray\]0.95     GUI-specific Models (RL)

UI-R1-E-3B Lu et al. ([2025](https://arxiv.org/html/2601.20380v1#bib.bib51 "UI-r1: enhancing efficient action prediction of gui agents by reinforcement learning"))

98.2

83.9

94.8

75.0

93.2

83.7

89.5

SE-GUI-7B Yuan et al. ([2025](https://arxiv.org/html/2601.20380v1#bib.bib52 "Enhancing visual grounding for gui agents via self-evolutionary reinforcement learning"))

\-

\-

\-

\-

\-

\-

90.3

LPO Tang et al. ([2025c](https://arxiv.org/html/2601.20380v1#bib.bib53 "LPO: towards accurate gui agent interaction via location preference optimization"))

97.9

82.9

95.9

86.4

95.6

84.2

90.5

GUI-G2\-7B Tang et al. ([2025a](https://arxiv.org/html/2601.20380v1#bib.bib42 "GUI-g2: gaussian reward modeling for gui grounding"))

\-

\-

\-

\-

\-

\-

93.3

Phi-Ground-7B-16C-DPO Zhang et al. ([2025a](https://arxiv.org/html/2601.20380v1#bib.bib54 "Phi-ground tech report: advancing perception in gui grounding"))

96.5

62.0

90.2

76.4

93.6

75.9

83.8

GTA1-7B† Yang et al. ([2025a](https://arxiv.org/html/2601.20380v1#bib.bib55 "Gta1: gui test-time scaling agent"))

99.0

88.6

94.9

89.3

92.3

86.7

92.4

GTA1-72B Yang et al. ([2025a](https://arxiv.org/html/2601.20380v1#bib.bib55 "Gta1: gui test-time scaling agent"))

99.3

92.4

97.4

89.3

95.3

91.4

94.8

UI-Venus-Ground-7B Gu et al. ([2025](https://arxiv.org/html/2601.20380v1#bib.bib1 "Ui-venus technical report: building high-performance ui agents with rft"))

99.0

90.0

97.0

90.7

96.2

88.7

94.1

UI-Venus-Ground-72B Gu et al. ([2025](https://arxiv.org/html/2601.20380v1#bib.bib1 "Ui-venus technical report: building high-performance ui agents with rft"))

99.7

93.8

95.9

90.0

96.2

92.6

95.3

OmegaUse-G

99.3

94.3

99.0

96.4

97.4

94.0

96.3

### 5.1  Experimental Setup

#### 5.1.1 Model Configurations

We employed a 30B-A3B VL model as the backbone of OmegaUse. In the SFT phase, we fine-tuned the model for one epoch using a learning rate of 1​e−51e^{-5}, a global batch size of 3232, and a temperature of 1.01.0. For the subsequent Grounding and Navigation RL phase, we trained for one epoch with a learning rate of 5​e−55e^{-5}, a global batch size of 6464, and a temperature of 1.01.0. Specifically for RL, we utilized 8 sampled responses per instruction and set the KL penalty coefficient β\\beta to 0.040.04. Across both phases, we maintained an MoE auxiliary loss coefficient of 1​e−61e^{-6} and a maximum image token limit of 16,38416,384.

### 5.2  Evaluation of GUI Grounding

We evaluate the grounding performance of our OmegaUse model across two major benchmarks: ScreenSpot-V2 and ScreenSpot-Pro. These benchmarks test the model’s ability to associate natural language instructions with diverse UI elements across mobile, web, and desktop platforms.

Table 5: Performance comparison of different agent models on ScreenSpot-Pro. The Avg. column represents the overall success rate across all categories.

Model

CAD

Dev

Creative

Scientific

Office

OS

Avg.

Text

Icon

Text

Icon

Text

Icon

Text

Icon

Text

Icon

Text

Icon

\\rowcolor\[gray\]0.95     Closed-source Models

GPT-4o Islam and Moushi ([2025](https://arxiv.org/html/2601.20380v1#bib.bib56 "Gpt-4o: the cutting-edge advancement in multimodal llm"))

2.0

0.0

1.3

0.0

1.0

0.0

2.1

0.0

1.1

0.0

0.0

0.0

0.8

Claude Computer Use Anthropic ([2024](https://arxiv.org/html/2601.20380v1#bib.bib67 "Developing computer use"))

14.5

3.7

22.0

3.9

25.9

3.4

33.9

15.8

30.1

16.3

11.0

4.5

17.1

UI-TARS-1.5 Seed ([2025](https://arxiv.org/html/2601.20380v1#bib.bib46 "UI-tars-1.5"))

\-

\-

\-

\-

\-

\-

\-

\-

\-

\-

\-

\-

61.6

Seed1.5-VL Guo et al. ([2025](https://arxiv.org/html/2601.20380v1#bib.bib47 "Seed1. 5-vl technical report"))

\-

\-

\-

\-

\-

\-

\-

\-

\-

\-

\-

\-

60.9

\\rowcolor\[gray\]0.95     GUI-specific Models (SFT)

SeeClick-9.6B Cheng et al. ([2024](https://arxiv.org/html/2601.20380v1#bib.bib4 "Seeclick: harnessing gui grounding for advanced visual gui agents"))

2.5

0.0

0.6

0.0

1.0

0.0

3.5

0.0

1.1

0.0

2.8

0.0

1.1

FOCUS-2B Tang et al. ([2025b](https://arxiv.org/html/2601.20380v1#bib.bib57 "Think twice, click once: enhancing gui grounding via fast and slow systems"))

7.6

3.1

22.8

1.7

23.7

1.7

25.0

7.1

23.2

7.7

17.8

2.5

13.3

CogAgent-18B Hong et al. ([2024](https://arxiv.org/html/2601.20380v1#bib.bib33 "CogAgent: a visual language model for gui agents"))

7.1

3.1

14.9

0.7

9.6

0.0

22.2

1.8

13.0

0.0

5.6

0.0

7.7

Aria-UI Yang et al. ([2025b](https://arxiv.org/html/2601.20380v1#bib.bib58 "Aria-ui: visual grounding for gui instructions"))

7.6

1.6

16.2

0.0

23.7

2.1

27.1

6.4

20.3

1.9

4.7

0.0

11.3

OS-Atlas-7B Wu et al. ([2024](https://arxiv.org/html/2601.20380v1#bib.bib35 "OS-atlas: a foundation action model for generalist gui agents"))

12.2

4.7

33.1

1.4

28.8

2.8

37.5

7.3

33.9

5.7

27.1

4.5

18.9

ShowUI-2B Lin et al. ([2025](https://arxiv.org/html/2601.20380v1#bib.bib16 "Showui: one vision-language-action model for gui visual agent"))

2.5

0.0

16.9

1.4

9.1

0.0

13.2

7.3

15.3

7.5

10.3

2.2

7.7

UGround-7B Qian et al. ([2025](https://arxiv.org/html/2601.20380v1#bib.bib6 "UGround: towards unified visual grounding with unrolled transformers"))

14.2

1.6

26.6

2.1

27.3

2.8

31.9

2.7

31.6

11.3

17.8

0.0

16.5

UGround-V1-7B Qian et al. ([2025](https://arxiv.org/html/2601.20380v1#bib.bib6 "UGround: towards unified visual grounding with unrolled transformers"))

15.8

1.2

51.9

2.8

47.5

9.7

57.6

14.5

60.5

13.2

38.3

7.9

31.1

UI-TARS-7B Qin et al. ([2025](https://arxiv.org/html/2601.20380v1#bib.bib12 "Ui-tars: pioneering automated gui interaction with native agents"))

20.8

9.4

58.4

12.4

50.0

9.1

63.9

31.8

63.3

20.8

30.8

16.9

35.7

UI-TARS-72B Qin et al. ([2025](https://arxiv.org/html/2601.20380v1#bib.bib12 "Ui-tars: pioneering automated gui interaction with native agents"))

18.8

12.5

62.9

17.2

57.1

15.4

64.6

20.9

63.3

26.4

42.1

15.7

38.1

JEDi-7B Xie et al. ([2025](https://arxiv.org/html/2601.20380v1#bib.bib48 "Scaling computer-use grounding via user interface decomposition and synthesis"))

38.0

14.1

42.9

11.0

50.0

11.9

72.9

25.5

75.1

47.2

33.6

16.9

39.5

GUI-Actor-7B Wu et al. ([2025](https://arxiv.org/html/2601.20380v1#bib.bib49 "GUI-actor: coordinate-free visual grounding for gui agents"))

\-

\-

\-

\-

\-

\-

\-

\-

\-

\-

\-

\-

44.6

OpenCUA-7B Wang et al. ([2025b](https://arxiv.org/html/2601.20380v1#bib.bib50 "Opencua: open foundations for computer-use agents"))

\-

\-

\-

\-

\-

\-

\-

\-

\-

\-

\-

\-

50.0

OpenCUA-32B Wang et al. ([2025b](https://arxiv.org/html/2601.20380v1#bib.bib50 "Opencua: open foundations for computer-use agents"))

\-

\-

\-

\-

\-

\-

\-

\-

\-

\-

\-

\-

55.3

\\rowcolor\[gray\]0.95     GUI-specific Models (RL)

UI-R1-E-3B Lu et al. ([2025](https://arxiv.org/html/2601.20380v1#bib.bib51 "UI-r1: enhancing efficient action prediction of gui agents by reinforcement learning"))

37.1

12.5

46.1

6.9

41.9

4.2

56.9

21.8

65.0

26.4

32.7

10.1

33.5

UI-R1-7B Lu et al. ([2025](https://arxiv.org/html/2601.20380v1#bib.bib51 "UI-r1: enhancing efficient action prediction of gui agents by reinforcement learning"))

23.9

6.3

49.4

4.8

38.9

8.4

55.6

11.8

58.7

26.4

42.1

16.9

\-

InfiGUI-R1-3B Liu et al. ([2025](https://arxiv.org/html/2601.20380v1#bib.bib59 "Infigui-r1: advancing multimodal gui agents from reactive actors to deliberative reasoners"))

33.0

14.1

51.3

12.4

44.9

7.0

58.3

20.0

65.5

28.3

43.9

12.4

35.7

GUI-G1-3B Zhou et al. ([2025b](https://arxiv.org/html/2601.20380v1#bib.bib41 "GUI-g1: understanding r1-zero-like training for visual grounding in gui agents"))

39.6

9.4

50.7

10.3

36.6

11.9

61.8

30.0

67.2

32.1

23.5

10.6

37.1

SE-GUI-7B Yuan et al. ([2025](https://arxiv.org/html/2601.20380v1#bib.bib52 "Enhancing visual grounding for gui agents via self-evolutionary reinforcement learning"))

51.3

42.2

68.2

19.3

57.6

9.1

75.0

28.2

78.5

43.4

49.5

25.8

47.3

Phi-Ground-7B-16C-DPO Zhang et al. ([2025a](https://arxiv.org/html/2601.20380v1#bib.bib54 "Phi-ground tech report: advancing perception in gui grounding"))

26.9

17.2

70.8

16.7

56.6

13.3

58.0

29.1

76.4

44.0

55.1

25.8

43.2

GUI-G2\-7B Tang et al. ([2025a](https://arxiv.org/html/2601.20380v1#bib.bib42 "GUI-g2: gaussian reward modeling for gui grounding"))

55.8

12.5

68.8

17.2

57.1

15.4

77.1

24.5

74.0

32.7

57.9

21.3

47.5

UI-TARS-1.5-7B Seed ([2025](https://arxiv.org/html/2601.20380v1#bib.bib46 "UI-tars-1.5"))

\-

\-

\-

\-

\-

\-

\-

\-

\-

\-

\-

\-

49.6

GTA1-7B†Yang et al. ([2025a](https://arxiv.org/html/2601.20380v1#bib.bib55 "Gta1: gui test-time scaling agent"))

53.3

17.2

66.9

20.7

62.6

18.2

76.4

31.8

82.5

50.9

48.6

25.9

50.1

GTA1-72B Yang et al. ([2025a](https://arxiv.org/html/2601.20380v1#bib.bib55 "Gta1: gui test-time scaling agent"))

56.9

28.1

79.9

33.1

73.2

20.3

81.9

38.2

85.3

49.1

73.8

39.1

58.4

UI-Venus-Ground-7B Gu et al. ([2025](https://arxiv.org/html/2601.20380v1#bib.bib1 "Ui-venus technical report: building high-performance ui agents with rft"))

60.4

21.9

74.7

24.1

63.1

14.7

76.4

31.8

75.7

41.5

49.5

22.5

50.8

UI-Venus-Ground-72B Gu et al. ([2025](https://arxiv.org/html/2601.20380v1#bib.bib1 "Ui-venus technical report: building high-performance ui agents with rft"))

66.5

29.7

84.4

33.1

73.2

30.8

84.7

42.7

83.1

60.4

75.7

36.0

61.9

OmegaUse-G

48.73

23.44

78.57

31.72

66.67

22.38

75.69

34.55

81.36

47.17

74.77

43.82

55.47

ScreenSpot-V2. As a fundamental GUI grounding benchmark, ScreenSpot-V2 measures the agent’s localization reliability across mobile, web, and desktop interfaces. As shown in Table [5](https://arxiv.org/html/2601.20380v1#S5 "5 Experiments ‣ OmegaUse: Building a General-Purpose GUI Agent for Autonomous Task Execution"), OmegaUse achieves an exceptional state-of-the-art average score of 96.3%, establishing a new performance ceiling for this benchmark. It consistently outperforms leading baselines, including UI-Venus-Ground-72B (95.3%) and Seed1.5-VL (95.2%). A detailed breakdown reveals that OmegaUse-G maintains near-perfect accuracy on text-based elements, particularly in the mobile and desktop segments, where it scores 99.3% and 99.0%, respectively. Furthermore, its performance on icon and widget localization remains remarkably high, reaching 96.4% on desktop and 94.0% on web platforms, demonstrating robust cross-platform generalization and precise spatial perception.

ScreenSpot-Pro. Compared to standard GUI grounding benchmarks, ScreenSpot-Pro presents a more rigorous evaluation by featuring high-resolution interfaces from professional software, often characterized by intricate and microscopic visual elements. In this challenging setting, as detailed in Table [5.2](https://arxiv.org/html/2601.20380v1#S5.SS2 "5.2 Evaluation of GUI Grounding ‣ 5.1.1 Model Configurations ‣ 5.1 Experimental Setup ‣ 5 Experiments ‣ OmegaUse: Building a General-Purpose GUI Agent for Autonomous Task Execution"), OmegaUse-G achieves a competitive average score of 55.47%.

While ultra-large-scale models such as UI-Venus-Ground-72B (61.9%) and GTA1-72B (58.4%) maintain a lead in overall performance, OmegaUse demonstrates specialized strengths in specific domains. Notably, it achieves the highest accuracy in the OS-Icon category (43.82%), outperforming all baseline models. Furthermore, it attains runner-up performance in several key metrics, including 74.77% in OS-Text, 31.72% in Dev-Icon, and 66.67% in Creative-Text. These results indicate that despite a smaller parameter scale compared to 72B-class models, OmegaUse-G exhibits robust precision in professional and system-level GUI environments, particularly in capturing fine-grained icon details and complex text layouts within creative and developer tools.

### 5.3  Evaluation of GUI Navigation

Navigation performance is evaluated on both widely used standard benchmarks and our specialized offline benchmark OS-Nav.

#### 5.3.1 Standard Benchmark

We evaluate the multi-step decision-making and planning capabilities of OmegaUse across two widely-adopted benchmarks: AndroidControl Li et al. ([2024](https://arxiv.org/html/2601.20380v1#bib.bib9 "On the effects of data scale on ui control agents")) for offline trajectory planning and AndroidWorld Rawles et al. ([2024](https://arxiv.org/html/2601.20380v1#bib.bib8 "Androidworld: a dynamic benchmarking environment for autonomous agents")) for online interaction. These evaluations assess the model’s ability to translate high-level user goals into coherent, executable action sequences.

Table 6: Performance comparison on the AndroidControl offline UI navigation dataset.

Model

Type Acc. (%)

Step SR (%)

\\rowcolor\[gray\]0.95     Open-source Models

SeeClick Cheng et al. ([2024](https://arxiv.org/html/2601.20380v1#bib.bib4 "Seeclick: harnessing gui grounding for advanced visual gui agents"))

82.9

59.1

OS-Atlas-7B Wu et al. ([2024](https://arxiv.org/html/2601.20380v1#bib.bib35 "OS-atlas: a foundation action model for generalist gui agents"))

85.2

71.2

Aguvis-7B Xu et al. ([2024](https://arxiv.org/html/2601.20380v1#bib.bib2 "Aguvis: unified pure vision agents for autonomous gui interaction"))

–

61.5

Aguvis-72B Xu et al. ([2024](https://arxiv.org/html/2601.20380v1#bib.bib2 "Aguvis: unified pure vision agents for autonomous gui interaction"))

–

66.4

OS-Genesis-7B Sun et al. ([2025](https://arxiv.org/html/2601.20380v1#bib.bib37 "OS-genesis: automating gui agent trajectory construction via reverse task synthesis"))

66.2

44.5

UI-TARS-7B Qin et al. ([2025](https://arxiv.org/html/2601.20380v1#bib.bib12 "Ui-tars: pioneering automated gui interaction with native agents"))

83.7

72.5

UI-TARS-72B Qin et al. ([2025](https://arxiv.org/html/2601.20380v1#bib.bib12 "Ui-tars: pioneering automated gui interaction with native agents"))

85.2

74.7

GUI-R1-7B Luo et al. ([2025a](https://arxiv.org/html/2601.20380v1#bib.bib60 "Gui-r1: a generalist r1-style vision-language action model for gui agents"))

71.6

51.7

NaviMaster-7B Luo et al. ([2025b](https://arxiv.org/html/2601.20380v1#bib.bib61 "Navimaster: learning a unified policy for gui and embodied navigation tasks"))

72.9

54.0

UI-AGILE-7B Lian et al. ([2025](https://arxiv.org/html/2601.20380v1#bib.bib62 "Ui-agile: advancing gui agents with effective reinforcement learning and precise inference-time grounding"))

80.1

60.6

AgentCPM-GUI Zhang et al. ([2025b](https://arxiv.org/html/2601.20380v1#bib.bib43 "AgentCPM-gui: building mobile-use agents with reinforcement fine-tuning"))

77.7

69.2

UI-Venus-Navi-7B Gu et al. ([2025](https://arxiv.org/html/2601.20380v1#bib.bib1 "Ui-venus technical report: building high-performance ui agents with rft"))

86.5

76.1

UI-Venus-Navi-72B Gu et al. ([2025](https://arxiv.org/html/2601.20380v1#bib.bib1 "Ui-venus technical report: building high-performance ui agents with rft"))

85.9

77.2

\\rowcolor\[gray\]0.95 OmegaUse

87.6

79.1

Table 7: Performance comparison on AndroidWorld for end-to-end models.

Models

Planner

A11y Tree

Screenshot

Success Rate

\\rowcolor\[gray\]0.95     Closed-source Models

GPT-4o Islam and Moushi ([2025](https://arxiv.org/html/2601.20380v1#bib.bib56 "Gpt-4o: the cutting-edge advancement in multimodal llm"))

×\\times

✓\\checkmark

×\\times

30.6

ScaleTrack Huang et al. ([2025](https://arxiv.org/html/2601.20380v1#bib.bib63 "Scaletrack: scaling and back-tracking automated gui agents"))

×\\times

✓\\checkmark

×\\times

44.0

SeedVL-1.5 Guo et al. ([2025](https://arxiv.org/html/2601.20380v1#bib.bib47 "Seed1. 5-vl technical report"))

×\\times

✓\\checkmark

✓\\checkmark

62.1

UI-TARS-1.5 Seed ([2025](https://arxiv.org/html/2601.20380v1#bib.bib46 "UI-tars-1.5"))

×\\times

×\\times

✓\\checkmark

64.2

\\rowcolor\[gray\]0.95     Open-source Models

GUI-Critic-R1-7B Wanyan et al. ([2025](https://arxiv.org/html/2601.20380v1#bib.bib64 "Look before you leap: a gui-critic-r1 model for pre-operative error diagnosis in gui automation"))

×\\times

✓\\checkmark

✓\\checkmark

27.6

Qwen2.5-VL-72B Bai et al. ([2025b](https://arxiv.org/html/2601.20380v1#bib.bib36 "Qwen2.5-vl technical report"))

×\\times

×\\times

✓\\checkmark

35.0

UGround Qian et al. ([2025](https://arxiv.org/html/2601.20380v1#bib.bib6 "UGround: towards unified visual grounding with unrolled transformers"))

✓\\checkmark

×\\times

✓\\checkmark

44.0

Aria-UI Yang et al. ([2025b](https://arxiv.org/html/2601.20380v1#bib.bib58 "Aria-ui: visual grounding for gui instructions"))

✓\\checkmark

×\\times

✓\\checkmark

44.8

UI-TARS-72B Qin et al. ([2025](https://arxiv.org/html/2601.20380v1#bib.bib12 "Ui-tars: pioneering automated gui interaction with native agents"))

×\\times

×\\times

✓\\checkmark

46.6

GLM-4.5v Team et al. ([2025](https://arxiv.org/html/2601.20380v1#bib.bib66 "GLM-4.1v-thinking: towards versatile multimodal reasoning with scalable reinforcement learning"))

×\\times

×\\times

✓\\checkmark

57.0

UI-Venus-Navi-7B Gu et al. ([2025](https://arxiv.org/html/2601.20380v1#bib.bib1 "Ui-venus technical report: building high-performance ui agents with rft"))

×\\times

×\\times

✓\\checkmark

49.1

UI-Venus-Navi-72B Gu et al. ([2025](https://arxiv.org/html/2601.20380v1#bib.bib1 "Ui-venus technical report: building high-performance ui agents with rft"))

×\\times

×\\times

✓\\checkmark

65.9

OmegaUse

×\\times

×\\times

✓\\checkmark

55.7

Table 8: Performance comparison on the ChiM-Nav offline navigation dataset.

Model

Type Acc. (%)

Step SR (%)

\\rowcolor\[gray\]0.95     Open-source Models

UI-TARS-SFT Qin et al. ([2025](https://arxiv.org/html/2601.20380v1#bib.bib12 "Ui-tars: pioneering automated gui interaction with native agents"))

53.28

36.97

UI-TARS-1.5 Seed ([2025](https://arxiv.org/html/2601.20380v1#bib.bib46 "UI-tars-1.5"))

64.12

37.24

GUI-R1-7B Luo et al. ([2025a](https://arxiv.org/html/2601.20380v1#bib.bib60 "Gui-r1: a generalist r1-style vision-language action model for gui agents"))

63.74

34.74

OS-Atlas-7B Wu et al. ([2024](https://arxiv.org/html/2601.20380v1#bib.bib35 "OS-atlas: a foundation action model for generalist gui agents"))

59.63

38.26

UI-AGILE-7B Lian et al. ([2025](https://arxiv.org/html/2601.20380v1#bib.bib62 "Ui-agile: advancing gui agents with effective reinforcement learning and precise inference-time grounding"))

70.2

45.96

AgentCPM-GUI Zhang et al. ([2025b](https://arxiv.org/html/2601.20380v1#bib.bib43 "AgentCPM-gui: building mobile-use agents with reinforcement fine-tuning"))

75.02

51.62

Holo2-30b-A3B Company ([2025](https://arxiv.org/html/2601.20380v1#bib.bib65 "Holo2 - open foundation models for navigation and computer use agents"))

73.76

60.69

Qwen3-VL-30b-A3B Bai et al. ([2025a](https://arxiv.org/html/2601.20380v1#bib.bib7 "Qwen3-vl technical report"))

78.2

65.19

UI-Venus-72B Gu et al. ([2025](https://arxiv.org/html/2601.20380v1#bib.bib1 "Ui-venus technical report: building high-performance ui agents with rft"))

81.23

67.51

Qwen3-VL-32B Bai et al. ([2025a](https://arxiv.org/html/2601.20380v1#bib.bib7 "Qwen3-vl technical report"))

80.83

66.39

\\rowcolor\[gray\]0.95 OmegaUse

87.78

74.24

Table 9: Performance comparison on the Ubu-Nav offline navigation dataset. Coord actions include Click, Drag, Scroll, LeftDouble, and RightSingle; Non-coord actions include Type, Hotkey, PressEnter, and Finish.

Model

Coord Actions (%)

Non-coord Actions (%)

Average (%)

\\rowcolor\[gray\]0.95     Open-source Models

UI-TARS-7B-SFT Qin et al. ([2025](https://arxiv.org/html/2601.20380v1#bib.bib12 "Ui-tars: pioneering automated gui interaction with native agents"))

32.8

4.6

28.9

UI-TARS-1.5-7B Seed ([2025](https://arxiv.org/html/2601.20380v1#bib.bib46 "UI-tars-1.5"))

32.2

17.4

30.2

OS-Atlas-Pro-7B Wu et al. ([2024](https://arxiv.org/html/2601.20380v1#bib.bib35 "OS-atlas: a foundation action model for generalist gui agents"))

34.2

16.0

31.7

Holo2-30B-A3B Company ([2025](https://arxiv.org/html/2601.20380v1#bib.bib65 "Holo2 - open foundation models for navigation and computer use agents"))

52.5

34.3

50.0

Qwen3-VL-30B-A3B Bai et al. ([2025a](https://arxiv.org/html/2601.20380v1#bib.bib7 "Qwen3-vl technical report"))

54.3

7.6

47.7

UI-Venus-Navi-72B Gu et al. ([2025](https://arxiv.org/html/2601.20380v1#bib.bib1 "Ui-venus technical report: building high-performance ui agents with rft"))

45.1

40.0

44.4

\\rowcolor\[gray\]0.95 OmegaUse

57.1

48.6

55.9

Offline Benchmark. We further assess the agent’s fundamental planning and task decomposition capabilities using the AndroidControl dataset, which provides high-level instructions that require significant summarization and reasoning. According to the results in Table 6, OmegaUse achieves SOTA performance, securing the first place in both evaluated metrics.

Specifically, OmegaUse reaches a Type Accuracy of 87.6% and a Step Success Rate (SR) of 79.1%. These scores surpass previous leading models such as UI-Venus-Navi-72B (85.9% Type Acc. / 77.2% Step SR) and UI-TARS-72B (85.2% Type Acc. / 74.7% Step SR). The superior performance on high-level instructions indicates that OmegaUse possesses a more robust internal world model for GUI environments.

Online Benchmark. To evaluate real-time interactive capabilities, we employ the AndroidWorld benchmark, which requires agents to navigate dynamic mobile environments. As shown in Table [5.3.1](https://arxiv.org/html/2601.20380v1#S5.SS3.SSS1 "5.3.1 Standard Benchmark ‣ 5.3 Evaluation of GUI Navigation ‣ 5.2 Evaluation of GUI Grounding ‣ 5.1.1 Model Configurations ‣ 5.1 Experimental Setup ‣ 5 Experiments ‣ OmegaUse: Building a General-Purpose GUI Agent for Autonomous Task Execution"), OmegaUse achieves a success rate of 55.7%. Notably, OmegaUse operates as a streamlined end-to-end agent, relying solely on screenshots without the assistance of external planners or Accessibility (A11y) trees.

Despite using fewer input modalities, OmegaUse demonstrates competitive performance against several larger-scale open-source models. It outperforms UI-TARS-72B (46.6%) and Aria-UI (44.8%), while remaining comparable to the high-parameter GLM-4.5v (57.0%). While a performance gap remains compared to state-of-the-art models such as UI-Venus-Navi-72B (65.9%), it is worth noting that UI-Venus-Navi-72B is a dense model with a much larger parameter size, whereas OmegaUse is a MoE-based model with a smaller overall parameter size.

#### 5.3.2 Specialized Offline Benchmarks

To further evaluate the agent’s generalization across diverse platforms and complex real-world workflows, we conduct experiments on our specialized OS-Nav offline benchmarks: ChiM-Nav for the Chinese mobile ecosystem and Ubu-Nav for Ubuntu desktop environments.

ChiM-Nav (Mobile). This benchmark specifically targets the unique UI layouts and multi-step workflows found in popular applications within the Chinese mobile ecosystem. As shown in Table [5.3.1](https://arxiv.org/html/2601.20380v1#S5.SS3.SSS1 "5.3.1 Standard Benchmark ‣ 5.3 Evaluation of GUI Navigation ‣ 5.2 Evaluation of GUI Grounding ‣ 5.1.1 Model Configurations ‣ 5.1 Experimental Setup ‣ 5 Experiments ‣ OmegaUse: Building a General-Purpose GUI Agent for Autonomous Task Execution"), OmegaUse achieves a Type Accuracy of 87.78% and a Step Success Rate (SR) of 74.24%, outperforming all existing open-source baselines.

Notably, it surpasses the high-parameter UI-Venus-72b, which scores 81.23% Type Acc. and 67.51% Step SR. The significant lead in Step SR (a gain of approximately 6.7%) suggests that OmegaUse is more capable of maintaining reasoning consistency in this scene.

Ubu-Nav (Desktop). The Ubu-Nav benchmark evaluates the agent’s proficiency in handling routine Ubuntu desktop operations across varied system interfaces. According to Table [5.3.1](https://arxiv.org/html/2601.20380v1#S5.SS3.SSS1 "5.3.1 Standard Benchmark ‣ 5.3 Evaluation of GUI Navigation ‣ 5.2 Evaluation of GUI Grounding ‣ 5.1.1 Model Configurations ‣ 5.1 Experimental Setup ‣ 5 Experiments ‣ OmegaUse: Building a General-Purpose GUI Agent for Autonomous Task Execution"), OmegaUse reaches an average performance of 55.9%, establishing a clear lead over the best-performing baseline, Holo2-30B-A3B (50.0%).

A breakdown of action types reveals that OmegaUse excels in both coordinate-based actions (Click, Drag, etc.) and non-coordinate actions (Type, Hotkey, etc.). Specifically, it achieves 48.6% in non-coordinate tasks, a substantial improvement over UI-Venus-Navi-72B (40.0%) and Holo2-30B-A3B (34.3%). These results demonstrate that OmegaUse effectively bridges the gap between spatial perception and semantic command execution, even in complex desktop environments requiring multi-window coordination.

## 6  Conclusion

In this report, we presented OmegaUse, a high-performance autonomous GUI agent model capable of navigating complex tasks across mobile and desktop, supporting phone-use and computer-use scenarios. By adopting a Mixture-of-Experts (MoE) backbone, we demonstrate that OmegaUse can maintain superior reasoning depth while significantly optimizing computational efficiency compared to dense models. To build a reliable data foundation, we introduced a carefully engineered data-construction pipeline that combines rigorously curated open-source datasets with an automated synthesis framework integrating bottom-up autonomous exploration and top-down taxonomy-guided generation, thereby producing high-fidelity training trajectories. To effectively leverage this curated data, we proposed a decoupled two-stage training paradigm, combining SFT with GRPO, successfully calibrates the model’s spatial grounding and sequential planning through specialized reward mechanisms. Empirical results across multiple platforms validate the robustness of our approach. OmegaUse establishes new performance records on major benchmarks, notably achieving a SOTA score of 96.3% on ScreenSpot-V2 and a leading 79.1% Step success rate on AndroidControl. Furthermore, we introduce OS-Nav, an offline benchmark for real-world GUI navigation, to enable systematic evaluation of GUI agents in an offline setting. In particular, ChiM-Nav, a Chinese GUI offline benchmark, provides the community with a comprehensive evaluation suite to help bridge the assessment gap within the Chinese digital ecosystem. Additionally, Ubu-Nav is the first offline benchmark designed to evaluate computer-use agents on Ubuntu desktop workflows. Moving forward, we aim to extend OmegaUse’s capabilities to even more intricate, real-world workflows and explore more advanced safety constraints and self-correction mechanisms to ensure reliable and trustworthy autonomous GUI interaction.

## References

*   \[1\] S. Agashe, J. Han, S. Gan, J. Yang, A. Li, and X. E. Wang (2024) Agent s: an open agentic framework that uses computers like a human. arXiv preprint arXiv:2410.08164. Cited by: [§2.2](https://arxiv.org/html/2601.20380v1#S2.SS2.p1.1 "2.2 GUI Agent Architectures: Modular Pipelines vs. Native Agents ‣ 2 Related Work ‣ OmegaUse: Building a General-Purpose GUI Agent for Autonomous Task Execution").
*   \[2\] Anthropic (2024) Developing computer use. Note: [https://www.anthropic.com/news/developing-computer-use](https://www.anthropic.com/news/developing-computer-use)Accessed: 2025-01-16 Cited by: [§5.2](https://arxiv.org/html/2601.20380v1#S5.SS2.1.1.1.6.5.1 "5.2 Evaluation of GUI Grounding ‣ 5.1.1 Model Configurations ‣ 5.1 Experimental Setup ‣ 5 Experiments ‣ OmegaUse: Building a General-Purpose GUI Agent for Autonomous Task Execution").
*   \[3\] C. Bai, X. Zang, Y. Xu, S. Sunkara, A. Rastogi, J. Chen, et al. (2021) Uibert: learning generic multimodal representations for ui understanding. arXiv preprint arXiv:2107.13731. Cited by: [§3.1.1](https://arxiv.org/html/2601.20380v1#S3.SS1.SSS1.p1.1 "3.1.1 Grounding Data Pipeline ‣ 3.1 OmegaUse-G: Foundation of Visual Perception ‣ 3 Methodology ‣ OmegaUse: Building a General-Purpose GUI Agent for Autonomous Task Execution").
*   \[4\] S. Bai, Y. Cai, R. Chen, K. Chen, X. Chen, Z. Cheng, L. Deng, W. Ding, C. Gao, C. Ge, et al. (2025) Qwen3-vl technical report. arXiv preprint arXiv:2511.21631. External Links: [Link](https://arxiv.org/abs/2511.21631) Cited by: [§5.3.1](https://arxiv.org/html/2601.20380v1#S5.SS3.SSS1.40.40.40.6.1.10.8.1 "5.3.1 Standard Benchmark ‣ 5.3 Evaluation of GUI Navigation ‣ 5.2 Evaluation of GUI Grounding ‣ 5.1.1 Model Configurations ‣ 5.1 Experimental Setup ‣ 5 Experiments ‣ OmegaUse: Building a General-Purpose GUI Agent for Autonomous Task Execution"), [§5.3.1](https://arxiv.org/html/2601.20380v1#S5.SS3.SSS1.40.40.40.6.1.12.10.1 "5.3.1 Standard Benchmark ‣ 5.3 Evaluation of GUI Navigation ‣ 5.2 Evaluation of GUI Grounding ‣ 5.1.1 Model Configurations ‣ 5.1 Experimental Setup ‣ 5 Experiments ‣ OmegaUse: Building a General-Purpose GUI Agent for Autonomous Task Execution"), [§5.3.1](https://arxiv.org/html/2601.20380v1#S5.SS3.SSS1.40.40.40.tab1.33.1.7.7.1 "5.3.1 Standard Benchmark ‣ 5.3 Evaluation of GUI Navigation ‣ 5.2 Evaluation of GUI Grounding ‣ 5.1.1 Model Configurations ‣ 5.1 Experimental Setup ‣ 5 Experiments ‣ OmegaUse: Building a General-Purpose GUI Agent for Autonomous Task Execution").
*   \[5\] S. Bai, K. Chen, X. Liu, et al. (2025) Qwen2.5-vl technical report. arXiv preprint arXiv:2502.13923. Cited by: [§1](https://arxiv.org/html/2601.20380v1#S1.p2.1 "1 Introduction ‣ OmegaUse: Building a General-Purpose GUI Agent for Autonomous Task Execution"), [§5.3.1](https://arxiv.org/html/2601.20380v1#S5.SS3.SSS1.18.18.18.18.18.4 "5.3.1 Standard Benchmark ‣ 5.3 Evaluation of GUI Navigation ‣ 5.2 Evaluation of GUI Grounding ‣ 5.1.1 Model Configurations ‣ 5.1 Experimental Setup ‣ 5 Experiments ‣ OmegaUse: Building a General-Purpose GUI Agent for Autonomous Task Execution").
*   \[6\] K. Cheng, Q. Sun, Y. Chu, F. Xu, L. YanTao, J. Zhang, and Z. Wu (2024) Seeclick: harnessing gui grounding for advanced visual gui agents. In Proceedings of the 62nd Annual Meeting of the Association for Computational Linguistics (Volume 1: Long Papers), pp. 9313–9332. Cited by: [§1](https://arxiv.org/html/2601.20380v1#S1.p1.1 "1 Introduction ‣ OmegaUse: Building a General-Purpose GUI Agent for Autonomous Task Execution"), [§1](https://arxiv.org/html/2601.20380v1#S1.p3.1 "1 Introduction ‣ OmegaUse: Building a General-Purpose GUI Agent for Autonomous Task Execution"), [§2.1](https://arxiv.org/html/2601.20380v1#S2.SS1.p2.1 "2.1 UI Grounding and GUI Perception ‣ 2 Related Work ‣ OmegaUse: Building a General-Purpose GUI Agent for Autonomous Task Execution"), [§3.1.1](https://arxiv.org/html/2601.20380v1#S3.SS1.SSS1.p1.1 "3.1.1 Grounding Data Pipeline ‣ 3.1 OmegaUse-G: Foundation of Visual Perception ‣ 3 Methodology ‣ OmegaUse: Building a General-Purpose GUI Agent for Autonomous Task Execution"), [§5](https://arxiv.org/html/2601.20380v1#S5.1.1.1.9.8.1 "5 Experiments ‣ OmegaUse: Building a General-Purpose GUI Agent for Autonomous Task Execution"), [§5.2](https://arxiv.org/html/2601.20380v1#S5.SS2.1.1.1.10.9.1 "5.2 Evaluation of GUI Grounding ‣ 5.1.1 Model Configurations ‣ 5.1 Experimental Setup ‣ 5 Experiments ‣ OmegaUse: Building a General-Purpose GUI Agent for Autonomous Task Execution"), [§5.3.1](https://arxiv.org/html/2601.20380v1#S5.SS3.SSS1.40.46.1.3.1.1 "5.3.1 Standard Benchmark ‣ 5.3 Evaluation of GUI Navigation ‣ 5.2 Evaluation of GUI Grounding ‣ 5.1.1 Model Configurations ‣ 5.1 Experimental Setup ‣ 5 Experiments ‣ OmegaUse: Building a General-Purpose GUI Agent for Autonomous Task Execution").
*   \[7\] H. Company (2025) Holo2 - open foundation models for navigation and computer use agents. External Links: [Link](https://huggingface.co/collections/hcompany/holo2) Cited by: [§5.3.1](https://arxiv.org/html/2601.20380v1#S5.SS3.SSS1.40.40.40.6.1.9.7.1 "5.3.1 Standard Benchmark ‣ 5.3 Evaluation of GUI Navigation ‣ 5.2 Evaluation of GUI Grounding ‣ 5.1.1 Model Configurations ‣ 5.1 Experimental Setup ‣ 5 Experiments ‣ OmegaUse: Building a General-Purpose GUI Agent for Autonomous Task Execution"), [§5.3.1](https://arxiv.org/html/2601.20380v1#S5.SS3.SSS1.40.40.40.tab1.33.1.6.6.1 "5.3.1 Standard Benchmark ‣ 5.3 Evaluation of GUI Navigation ‣ 5.2 Evaluation of GUI Grounding ‣ 5.1.1 Model Configurations ‣ 5.1 Experimental Setup ‣ 5 Experiments ‣ OmegaUse: Building a General-Purpose GUI Agent for Autonomous Task Execution").
*   \[8\] DeepSeek-AI (2025) DeepSeek-r1: incentivizing reasoning capability in llms via reinforcement learning. arXiv preprint arXiv:2501.12948. Cited by: [§1](https://arxiv.org/html/2601.20380v1#S1.p5.1 "1 Introduction ‣ OmegaUse: Building a General-Purpose GUI Agent for Autonomous Task Execution").
*   \[9\] X. Deng, Y. Gu, B. Zheng, S. Chen, S. Stevens, B. Wang, H. Sun, and Y. Su (2023) Mind2web: towards a generalist agent for the web. In Advances in Neural Information Processing Systems, Vol. 36, pp. 28091–28114. Cited by: [§3.2.2](https://arxiv.org/html/2601.20380v1#S3.SS2.SSS2.p2.1 "3.2.2 Hierarchical Navigation Data Pipeline ‣ 3.2 OmegaUse: Advanced Planning and Navigation ‣ 3 Methodology ‣ OmegaUse: Building a General-Purpose GUI Agent for Autonomous Task Execution").
*   \[10\] T. Fu, A. Su, C. Zhao, H. Wang, M. Wu, Z. Yu, F. Hu, M. Shi, W. Dong, J. Wang, et al. (2025) Mano technical report. arXiv preprint arXiv:2509.17336. Cited by: [§2.2](https://arxiv.org/html/2601.20380v1#S2.SS2.p2.1 "2.2 GUI Agent Architectures: Modular Pipelines vs. Native Agents ‣ 2 Related Work ‣ OmegaUse: Building a General-Purpose GUI Agent for Autonomous Task Execution").
*   \[11\] G. Gonzalez-Pumariega, V. Tu, C. Lee, J. Yang, A. Li, and X. E. Wang (2025) The unreasonable effectiveness of scaling agents for computer use. arXiv preprint arXiv:2510.02250. Cited by: [§2.2](https://arxiv.org/html/2601.20380v1#S2.SS2.p1.1 "2.2 GUI Agent Architectures: Modular Pipelines vs. Native Agents ‣ 2 Related Work ‣ OmegaUse: Building a General-Purpose GUI Agent for Autonomous Task Execution").
*   \[12\] B. Gou, R. Wang, B. Zheng, Y. Xie, C. Chang, Y. Shu, H. Sun, and Y. Su (2024) Navigating the digital world as humans do: universal visual grounding for gui agents. arXiv preprint arXiv:2410.05243. Cited by: [§2.1](https://arxiv.org/html/2601.20380v1#S2.SS1.p1.1 "2.1 UI Grounding and GUI Perception ‣ 2 Related Work ‣ OmegaUse: Building a General-Purpose GUI Agent for Autonomous Task Execution").
*   \[13\] Z. Gu, Z. Zeng, Z. Xu, X. Zhou, S. Shen, Y. Liu, B. Zhou, C. Meng, T. Xia, W. Chen, et al. (2025) Ui-venus technical report: building high-performance ui agents with rft. arXiv preprint arXiv:2508.10833. Cited by: [§1](https://arxiv.org/html/2601.20380v1#S1.p2.1 "1 Introduction ‣ OmegaUse: Building a General-Purpose GUI Agent for Autonomous Task Execution"), [§1](https://arxiv.org/html/2601.20380v1#S1.p3.1 "1 Introduction ‣ OmegaUse: Building a General-Purpose GUI Agent for Autonomous Task Execution"), [§1](https://arxiv.org/html/2601.20380v1#S1.p5.1 "1 Introduction ‣ OmegaUse: Building a General-Purpose GUI Agent for Autonomous Task Execution"), [§2.2](https://arxiv.org/html/2601.20380v1#S2.SS2.p2.1 "2.2 GUI Agent Architectures: Modular Pipelines vs. Native Agents ‣ 2 Related Work ‣ OmegaUse: Building a General-Purpose GUI Agent for Autonomous Task Execution"), [§3.1.1](https://arxiv.org/html/2601.20380v1#S3.SS1.SSS1.p2.1 "3.1.1 Grounding Data Pipeline ‣ 3.1 OmegaUse-G: Foundation of Visual Perception ‣ 3 Methodology ‣ OmegaUse: Building a General-Purpose GUI Agent for Autonomous Task Execution"), [§3.1.2](https://arxiv.org/html/2601.20380v1#S3.SS1.SSS2.p3.8 "3.1.2 Two-Stage Grounding Training ‣ 3.1 OmegaUse-G: Foundation of Visual Perception ‣ 3 Methodology ‣ OmegaUse: Building a General-Purpose GUI Agent for Autonomous Task Execution"), [§3.2.2](https://arxiv.org/html/2601.20380v1#S3.SS2.SSS2.p2.1 "3.2.2 Hierarchical Navigation Data Pipeline ‣ 3.2 OmegaUse: Advanced Planning and Navigation ‣ 3 Methodology ‣ OmegaUse: Building a General-Purpose GUI Agent for Autonomous Task Execution"), [§5](https://arxiv.org/html/2601.20380v1#S5.1.1.1.27.26.1 "5 Experiments ‣ OmegaUse: Building a General-Purpose GUI Agent for Autonomous Task Execution"), [§5](https://arxiv.org/html/2601.20380v1#S5.1.1.1.28.27.1 "5 Experiments ‣ OmegaUse: Building a General-Purpose GUI Agent for Autonomous Task Execution"), [§5.2](https://arxiv.org/html/2601.20380v1#S5.SS2.1.1.1.34.33.1 "5.2 Evaluation of GUI Grounding ‣ 5.1.1 Model Configurations ‣ 5.1 Experimental Setup ‣ 5 Experiments ‣ OmegaUse: Building a General-Purpose GUI Agent for Autonomous Task Execution"), [§5.2](https://arxiv.org/html/2601.20380v1#S5.SS2.1.1.1.35.34.1 "5.2 Evaluation of GUI Grounding ‣ 5.1.1 Model Configurations ‣ 5.1 Experimental Setup ‣ 5 Experiments ‣ OmegaUse: Building a General-Purpose GUI Agent for Autonomous Task Execution"), [§5.3.1](https://arxiv.org/html/2601.20380v1#S5.SS3.SSS1.33.33.33.33.33.4 "5.3.1 Standard Benchmark ‣ 5.3 Evaluation of GUI Navigation ‣ 5.2 Evaluation of GUI Grounding ‣ 5.1.1 Model Configurations ‣ 5.1 Experimental Setup ‣ 5 Experiments ‣ OmegaUse: Building a General-Purpose GUI Agent for Autonomous Task Execution"), [§5.3.1](https://arxiv.org/html/2601.20380v1#S5.SS3.SSS1.36.36.36.36.36.4 "5.3.1 Standard Benchmark ‣ 5.3 Evaluation of GUI Navigation ‣ 5.2 Evaluation of GUI Grounding ‣ 5.1.1 Model Configurations ‣ 5.1 Experimental Setup ‣ 5 Experiments ‣ OmegaUse: Building a General-Purpose GUI Agent for Autonomous Task Execution"), [§5.3.1](https://arxiv.org/html/2601.20380v1#S5.SS3.SSS1.40.40.40.6.1.11.9.1 "5.3.1 Standard Benchmark ‣ 5.3 Evaluation of GUI Navigation ‣ 5.2 Evaluation of GUI Grounding ‣ 5.1.1 Model Configurations ‣ 5.1 Experimental Setup ‣ 5 Experiments ‣ OmegaUse: Building a General-Purpose GUI Agent for Autonomous Task Execution"), [§5.3.1](https://arxiv.org/html/2601.20380v1#S5.SS3.SSS1.40.40.40.tab1.33.1.8.8.1 "5.3.1 Standard Benchmark ‣ 5.3 Evaluation of GUI Navigation ‣ 5.2 Evaluation of GUI Grounding ‣ 5.1.1 Model Configurations ‣ 5.1 Experimental Setup ‣ 5 Experiments ‣ OmegaUse: Building a General-Purpose GUI Agent for Autonomous Task Execution"), [§5.3.1](https://arxiv.org/html/2601.20380v1#S5.SS3.SSS1.40.46.1.14.12.1 "5.3.1 Standard Benchmark ‣ 5.3 Evaluation of GUI Navigation ‣ 5.2 Evaluation of GUI Grounding ‣ 5.1.1 Model Configurations ‣ 5.1 Experimental Setup ‣ 5 Experiments ‣ OmegaUse: Building a General-Purpose GUI Agent for Autonomous Task Execution"), [§5.3.1](https://arxiv.org/html/2601.20380v1#S5.SS3.SSS1.40.46.1.15.13.1 "5.3.1 Standard Benchmark ‣ 5.3 Evaluation of GUI Navigation ‣ 5.2 Evaluation of GUI Grounding ‣ 5.1.1 Model Configurations ‣ 5.1 Experimental Setup ‣ 5 Experiments ‣ OmegaUse: Building a General-Purpose GUI Agent for Autonomous Task Execution").
*   \[14\] D. Guo, F. Wu, F. Zhu, F. Leng, G. Shi, H. Chen, H. Fan, J. Wang, J. Jiang, J. Wang, et al. (2025) Seed1. 5-vl technical report. arXiv preprint arXiv:2505.07062. Cited by: [§5](https://arxiv.org/html/2601.20380v1#S5.1.1.1.7.6.1 "5 Experiments ‣ OmegaUse: Building a General-Purpose GUI Agent for Autonomous Task Execution"), [§5.2](https://arxiv.org/html/2601.20380v1#S5.SS2.1.1.1.8.7.1 "5.2 Evaluation of GUI Grounding ‣ 5.1.1 Model Configurations ‣ 5.1 Experimental Setup ‣ 5 Experiments ‣ OmegaUse: Building a General-Purpose GUI Agent for Autonomous Task Execution"), [§5.3.1](https://arxiv.org/html/2601.20380v1#S5.SS3.SSS1.9.9.9.9.9.4 "5.3.1 Standard Benchmark ‣ 5.3 Evaluation of GUI Navigation ‣ 5.2 Evaluation of GUI Grounding ‣ 5.1.1 Model Configurations ‣ 5.1 Experimental Setup ‣ 5 Experiments ‣ OmegaUse: Building a General-Purpose GUI Agent for Autonomous Task Execution").
*   \[15\] W. Hong, W. Wang, Q. Lv, et al. (2024) CogAgent: a visual language model for gui agents. In Proceedings of the IEEE/CVF Conference on Computer Vision and Pattern Recognition (CVPR), Cited by: [§1](https://arxiv.org/html/2601.20380v1#S1.p1.1 "1 Introduction ‣ OmegaUse: Building a General-Purpose GUI Agent for Autonomous Task Execution"), [§1](https://arxiv.org/html/2601.20380v1#S1.p5.1 "1 Introduction ‣ OmegaUse: Building a General-Purpose GUI Agent for Autonomous Task Execution"), [§5.2](https://arxiv.org/html/2601.20380v1#S5.SS2.1.1.1.12.11.1 "5.2 Evaluation of GUI Grounding ‣ 5.1.1 Model Configurations ‣ 5.1 Experimental Setup ‣ 5 Experiments ‣ OmegaUse: Building a General-Purpose GUI Agent for Autonomous Task Execution").
*   \[16\] J. Huang, Z. Zeng, W. Han, Y. Zhong, L. Zheng, S. Fu, J. Chen, and L. Ma (2025) Scaletrack: scaling and back-tracking automated gui agents. arXiv preprint arXiv:2505.00416. Cited by: [§5.3.1](https://arxiv.org/html/2601.20380v1#S5.SS3.SSS1.6.6.6.6.6.4 "5.3.1 Standard Benchmark ‣ 5.3 Evaluation of GUI Navigation ‣ 5.2 Evaluation of GUI Grounding ‣ 5.1.1 Model Configurations ‣ 5.1 Experimental Setup ‣ 5 Experiments ‣ OmegaUse: Building a General-Purpose GUI Agent for Autonomous Task Execution").
*   \[17\] R. Islam and O. M. Moushi (2025) Gpt-4o: the cutting-edge advancement in multimodal llm. In Intelligent Computing-Proceedings of the Computing Conference, pp. 47–60. Cited by: [§5](https://arxiv.org/html/2601.20380v1#S5.1.1.1.5.4.1 "5 Experiments ‣ OmegaUse: Building a General-Purpose GUI Agent for Autonomous Task Execution"), [§5.2](https://arxiv.org/html/2601.20380v1#S5.SS2.1.1.1.5.4.1 "5.2 Evaluation of GUI Grounding ‣ 5.1.1 Model Configurations ‣ 5.1 Experimental Setup ‣ 5 Experiments ‣ OmegaUse: Building a General-Purpose GUI Agent for Autonomous Task Execution"), [§5.3.1](https://arxiv.org/html/2601.20380v1#S5.SS3.SSS1.3.3.3.3.3.4 "5.3.1 Standard Benchmark ‣ 5.3 Evaluation of GUI Navigation ‣ 5.2 Evaluation of GUI Grounding ‣ 5.1.1 Model Configurations ‣ 5.1 Experimental Setup ‣ 5 Experiments ‣ OmegaUse: Building a General-Purpose GUI Agent for Autonomous Task Execution").
*   \[18\] H. Lai, X. Liu, I. L. Iong, S. Yao, Y. Chen, P. Shen, H. Yu, H. Zhang, X. Zhang, Y. Dong, et al. (2024) Autowebglm: a large language model-based web navigating agent. In Proceedings of the 30th ACM SIGKDD Conference on Knowledge Discovery and Data Mining, pp. 5295–5306. Cited by: [§2.2](https://arxiv.org/html/2601.20380v1#S2.SS2.p2.1 "2.2 GUI Agent Architectures: Modular Pipelines vs. Native Agents ‣ 2 Related Work ‣ OmegaUse: Building a General-Purpose GUI Agent for Autonomous Task Execution").
*   \[19\] K. Li, Z. Meng, H. Lin, Z. Luo, Y. Tian, J. Ma, Z. Huang, and T. Chua (2025) Screenspot-pro: gui grounding for professional high-resolution computer use. In Proceedings of the 33rd ACM International Conference on Multimedia, pp. 8778–8786. Cited by: [§2.1](https://arxiv.org/html/2601.20380v1#S2.SS1.p2.1 "2.1 UI Grounding and GUI Perception ‣ 2 Related Work ‣ OmegaUse: Building a General-Purpose GUI Agent for Autonomous Task Execution").
*   \[20\] W. Li, W. E. Bishop, A. Li, C. Rawles, F. Campbell-Ajala, D. Tyamagundlu, and O. Riva (2024) On the effects of data scale on ui control agents. Advances in Neural Information Processing Systems 37, pp. 92130–92154. Cited by: [§1](https://arxiv.org/html/2601.20380v1#S1.p3.1 "1 Introduction ‣ OmegaUse: Building a General-Purpose GUI Agent for Autonomous Task Execution"), [§5.3.1](https://arxiv.org/html/2601.20380v1#S5.SS3.SSS1.p1.1 "5.3.1 Standard Benchmark ‣ 5.3 Evaluation of GUI Navigation ‣ 5.2 Evaluation of GUI Grounding ‣ 5.1.1 Model Configurations ‣ 5.1 Experimental Setup ‣ 5 Experiments ‣ OmegaUse: Building a General-Purpose GUI Agent for Autonomous Task Execution").
*   \[21\] Y. Li, G. Li, L. He, J. Zheng, H. Li, and Z. Guan (2020) Widget captioning: generating natural language description for mobile user interface elements. arXiv preprint arXiv:2010.04295. Cited by: [§3.1.1](https://arxiv.org/html/2601.20380v1#S3.SS1.SSS1.p1.1 "3.1.1 Grounding Data Pipeline ‣ 3.1 OmegaUse-G: Foundation of Visual Perception ‣ 3 Methodology ‣ OmegaUse: Building a General-Purpose GUI Agent for Autonomous Task Execution").
*   \[22\] Y. Li, Z. Yang, Y. Guo, and X. Chen (2017) Droidbot: a lightweight ui-guided test input generator for android. In 2017 IEEE/ACM 39th international conference on software engineering companion (ICSE-C), pp. 23–26. Cited by: [§3.2.2](https://arxiv.org/html/2601.20380v1#S3.SS2.SSS2.p6.1 "3.2.2 Hierarchical Navigation Data Pipeline ‣ 3.2 OmegaUse: Advanced Planning and Navigation ‣ 3 Methodology ‣ OmegaUse: Building a General-Purpose GUI Agent for Autonomous Task Execution").
*   \[23\] S. Lian, Y. Wu, J. Ma, Y. Ding, Z. Song, B. Chen, X. Zheng, and H. Li (2025) Ui-agile: advancing gui agents with effective reinforcement learning and precise inference-time grounding. arXiv preprint arXiv:2507.22025. Cited by: [§5.3.1](https://arxiv.org/html/2601.20380v1#S5.SS3.SSS1.40.40.40.6.1.7.5.1 "5.3.1 Standard Benchmark ‣ 5.3 Evaluation of GUI Navigation ‣ 5.2 Evaluation of GUI Grounding ‣ 5.1.1 Model Configurations ‣ 5.1 Experimental Setup ‣ 5 Experiments ‣ OmegaUse: Building a General-Purpose GUI Agent for Autonomous Task Execution"), [§5.3.1](https://arxiv.org/html/2601.20380v1#S5.SS3.SSS1.40.46.1.12.10.1 "5.3.1 Standard Benchmark ‣ 5.3 Evaluation of GUI Navigation ‣ 5.2 Evaluation of GUI Grounding ‣ 5.1.1 Model Configurations ‣ 5.1 Experimental Setup ‣ 5 Experiments ‣ OmegaUse: Building a General-Purpose GUI Agent for Autonomous Task Execution").
*   \[24\] K. Q. Lin, L. Li, D. Gao, Z. Yang, S. Wu, Z. Bai, S. W. Lei, L. Wang, and M. Z. Shou (2025) Showui: one vision-language-action model for gui visual agent. In Proceedings of the Computer Vision and Pattern Recognition Conference, pp. 19498–19508. Cited by: [§2.1](https://arxiv.org/html/2601.20380v1#S2.SS1.p2.1 "2.1 UI Grounding and GUI Perception ‣ 2 Related Work ‣ OmegaUse: Building a General-Purpose GUI Agent for Autonomous Task Execution"), [§5](https://arxiv.org/html/2601.20380v1#S5.1.1.1.10.9.1 "5 Experiments ‣ OmegaUse: Building a General-Purpose GUI Agent for Autonomous Task Execution"), [§5.2](https://arxiv.org/html/2601.20380v1#S5.SS2.1.1.1.15.14.1 "5.2 Evaluation of GUI Grounding ‣ 5.1.1 Model Configurations ‣ 5.1 Experimental Setup ‣ 5 Experiments ‣ OmegaUse: Building a General-Purpose GUI Agent for Autonomous Task Execution").
*   \[25\] X. Liu, B. Qin, D. Liang, G. Dong, H. Lai, H. Zhang, H. Zhao, I. L. Iong, J. Sun, J. Wang, et al. (2024) Autoglm: autonomous foundation agents for guis. arXiv preprint arXiv:2411.00820. Cited by: [§2.2](https://arxiv.org/html/2601.20380v1#S2.SS2.p2.1 "2.2 GUI Agent Architectures: Modular Pipelines vs. Native Agents ‣ 2 Related Work ‣ OmegaUse: Building a General-Purpose GUI Agent for Autonomous Task Execution").
*   \[26\] Y. Liu, P. Li, C. Xie, X. Hu, X. Han, S. Zhang, H. Yang, and F. Wu (2025) Infigui-r1: advancing multimodal gui agents from reactive actors to deliberative reasoners. arXiv preprint arXiv:2504.14239. Cited by: [§2.1](https://arxiv.org/html/2601.20380v1#S2.SS1.p3.1 "2.1 UI Grounding and GUI Perception ‣ 2 Related Work ‣ OmegaUse: Building a General-Purpose GUI Agent for Autonomous Task Execution"), [§5.2](https://arxiv.org/html/2601.20380v1#S5.SS2.1.1.1.27.26.1 "5.2 Evaluation of GUI Grounding ‣ 5.1.1 Model Configurations ‣ 5.1 Experimental Setup ‣ 5 Experiments ‣ OmegaUse: Building a General-Purpose GUI Agent for Autonomous Task Execution").
*   \[27\] Z. Lu, Y. Chai, Y. Guo, X. Yin, L. Liu, H. Wang, H. Xiao, S. Ren, G. Xiong, and H. Li (2025) UI-r1: enhancing efficient action prediction of gui agents by reinforcement learning. arXiv preprint arXiv:2503.21620. Cited by: [§2.1](https://arxiv.org/html/2601.20380v1#S2.SS1.p3.1 "2.1 UI Grounding and GUI Perception ‣ 2 Related Work ‣ OmegaUse: Building a General-Purpose GUI Agent for Autonomous Task Execution"), [§5](https://arxiv.org/html/2601.20380v1#S5.1.1.1.21.20.1 "5 Experiments ‣ OmegaUse: Building a General-Purpose GUI Agent for Autonomous Task Execution"), [§5.2](https://arxiv.org/html/2601.20380v1#S5.SS2.1.1.1.25.24.1 "5.2 Evaluation of GUI Grounding ‣ 5.1.1 Model Configurations ‣ 5.1 Experimental Setup ‣ 5 Experiments ‣ OmegaUse: Building a General-Purpose GUI Agent for Autonomous Task Execution"), [§5.2](https://arxiv.org/html/2601.20380v1#S5.SS2.1.1.1.26.25.1 "5.2 Evaluation of GUI Grounding ‣ 5.1.1 Model Configurations ‣ 5.1 Experimental Setup ‣ 5 Experiments ‣ OmegaUse: Building a General-Purpose GUI Agent for Autonomous Task Execution").
*   \[28\] R. Luo, L. Wang, W. He, L. Chen, J. Li, and X. Xia (2025) Gui-r1: a generalist r1-style vision-language action model for gui agents. arXiv preprint arXiv:2504.10458. Cited by: [§2.1](https://arxiv.org/html/2601.20380v1#S2.SS1.p3.1 "2.1 UI Grounding and GUI Perception ‣ 2 Related Work ‣ OmegaUse: Building a General-Purpose GUI Agent for Autonomous Task Execution"), [§5.3.1](https://arxiv.org/html/2601.20380v1#S5.SS3.SSS1.40.40.40.6.1.5.3.1 "5.3.1 Standard Benchmark ‣ 5.3 Evaluation of GUI Navigation ‣ 5.2 Evaluation of GUI Grounding ‣ 5.1.1 Model Configurations ‣ 5.1 Experimental Setup ‣ 5 Experiments ‣ OmegaUse: Building a General-Purpose GUI Agent for Autonomous Task Execution"), [§5.3.1](https://arxiv.org/html/2601.20380v1#S5.SS3.SSS1.40.46.1.10.8.1 "5.3.1 Standard Benchmark ‣ 5.3 Evaluation of GUI Navigation ‣ 5.2 Evaluation of GUI Grounding ‣ 5.1.1 Model Configurations ‣ 5.1 Experimental Setup ‣ 5 Experiments ‣ OmegaUse: Building a General-Purpose GUI Agent for Autonomous Task Execution").
*   \[29\] Z. Luo, W. Yan, J. Gong, M. Wang, Z. Zhang, X. Wang, Y. Xie, and X. Tan (2025) Navimaster: learning a unified policy for gui and embodied navigation tasks. arXiv preprint arXiv:2508.02046. Cited by: [§5.3.1](https://arxiv.org/html/2601.20380v1#S5.SS3.SSS1.40.46.1.11.9.1 "5.3.1 Standard Benchmark ‣ 5.3 Evaluation of GUI Navigation ‣ 5.2 Evaluation of GUI Grounding ‣ 5.1.1 Model Configurations ‣ 5.1 Experimental Setup ‣ 5 Experiments ‣ OmegaUse: Building a General-Purpose GUI Agent for Autonomous Task Execution").
*   \[30\] A. Nguyen (2024) Improved gui grounding via iterative narrowing. arXiv preprint arXiv:2411.13591. Cited by: [§2.1](https://arxiv.org/html/2601.20380v1#S2.SS1.p2.1 "2.1 UI Grounding and GUI Perception ‣ 2 Related Work ‣ OmegaUse: Building a General-Purpose GUI Agent for Autonomous Task Execution").
*   \[31\] R. Qian, X. Yin, C. Deng, Z. Peng, J. Xiong, W. Zhai, and D. Dou (2025) UGround: towards unified visual grounding with unrolled transformers. arXiv preprint arXiv:2510.03853. Cited by: [§2.1](https://arxiv.org/html/2601.20380v1#S2.SS1.p3.1 "2.1 UI Grounding and GUI Perception ‣ 2 Related Work ‣ OmegaUse: Building a General-Purpose GUI Agent for Autonomous Task Execution"), [§3.1.1](https://arxiv.org/html/2601.20380v1#S3.SS1.SSS1.p1.1 "3.1.1 Grounding Data Pipeline ‣ 3.1 OmegaUse-G: Foundation of Visual Perception ‣ 3 Methodology ‣ OmegaUse: Building a General-Purpose GUI Agent for Autonomous Task Execution"), [§5](https://arxiv.org/html/2601.20380v1#S5.1.1.1.11.10.1 "5 Experiments ‣ OmegaUse: Building a General-Purpose GUI Agent for Autonomous Task Execution"), [§5.2](https://arxiv.org/html/2601.20380v1#S5.SS2.1.1.1.16.15.1 "5.2 Evaluation of GUI Grounding ‣ 5.1.1 Model Configurations ‣ 5.1 Experimental Setup ‣ 5 Experiments ‣ OmegaUse: Building a General-Purpose GUI Agent for Autonomous Task Execution"), [§5.2](https://arxiv.org/html/2601.20380v1#S5.SS2.1.1.1.17.16.1 "5.2 Evaluation of GUI Grounding ‣ 5.1.1 Model Configurations ‣ 5.1 Experimental Setup ‣ 5 Experiments ‣ OmegaUse: Building a General-Purpose GUI Agent for Autonomous Task Execution"), [§5.3.1](https://arxiv.org/html/2601.20380v1#S5.SS3.SSS1.21.21.21.21.21.4 "5.3.1 Standard Benchmark ‣ 5.3 Evaluation of GUI Navigation ‣ 5.2 Evaluation of GUI Grounding ‣ 5.1.1 Model Configurations ‣ 5.1 Experimental Setup ‣ 5 Experiments ‣ OmegaUse: Building a General-Purpose GUI Agent for Autonomous Task Execution").
*   \[32\] Y. Qian, Y. Lu, A. G. Hauptmann, and O. Riva (2024) Visual grounding for user interfaces. In Proceedings of the 2024 Conference of the North American Chapter of the Association for Computational Linguistics: Human Language Technologies (Volume 6: Industry Track), pp. 97–107. Cited by: [§2.1](https://arxiv.org/html/2601.20380v1#S2.SS1.p1.1 "2.1 UI Grounding and GUI Perception ‣ 2 Related Work ‣ OmegaUse: Building a General-Purpose GUI Agent for Autonomous Task Execution"), [§2.1](https://arxiv.org/html/2601.20380v1#S2.SS1.p2.1 "2.1 UI Grounding and GUI Perception ‣ 2 Related Work ‣ OmegaUse: Building a General-Purpose GUI Agent for Autonomous Task Execution").
*   \[33\] Y. Qin, Y. Ye, J. Fang, H. Wang, S. Liang, S. Tian, J. Zhang, J. Li, Y. Li, S. Huang, et al. (2025) Ui-tars: pioneering automated gui interaction with native agents. arXiv preprint arXiv:2501.12326. Cited by: [§1](https://arxiv.org/html/2601.20380v1#S1.p1.1 "1 Introduction ‣ OmegaUse: Building a General-Purpose GUI Agent for Autonomous Task Execution"), [§1](https://arxiv.org/html/2601.20380v1#S1.p2.1 "1 Introduction ‣ OmegaUse: Building a General-Purpose GUI Agent for Autonomous Task Execution"), [§1](https://arxiv.org/html/2601.20380v1#S1.p5.1 "1 Introduction ‣ OmegaUse: Building a General-Purpose GUI Agent for Autonomous Task Execution"), [§2.2](https://arxiv.org/html/2601.20380v1#S2.SS2.p2.1 "2.2 GUI Agent Architectures: Modular Pipelines vs. Native Agents ‣ 2 Related Work ‣ OmegaUse: Building a General-Purpose GUI Agent for Autonomous Task Execution"), [§5](https://arxiv.org/html/2601.20380v1#S5.1.1.1.14.13.1 "5 Experiments ‣ OmegaUse: Building a General-Purpose GUI Agent for Autonomous Task Execution"), [§5](https://arxiv.org/html/2601.20380v1#S5.1.1.1.15.14.1 "5 Experiments ‣ OmegaUse: Building a General-Purpose GUI Agent for Autonomous Task Execution"), [§5.2](https://arxiv.org/html/2601.20380v1#S5.SS2.1.1.1.18.17.1 "5.2 Evaluation of GUI Grounding ‣ 5.1.1 Model Configurations ‣ 5.1 Experimental Setup ‣ 5 Experiments ‣ OmegaUse: Building a General-Purpose GUI Agent for Autonomous Task Execution"), [§5.2](https://arxiv.org/html/2601.20380v1#S5.SS2.1.1.1.19.18.1 "5.2 Evaluation of GUI Grounding ‣ 5.1.1 Model Configurations ‣ 5.1 Experimental Setup ‣ 5 Experiments ‣ OmegaUse: Building a General-Purpose GUI Agent for Autonomous Task Execution"), [§5.3.1](https://arxiv.org/html/2601.20380v1#S5.SS3.SSS1.27.27.27.27.27.4 "5.3.1 Standard Benchmark ‣ 5.3 Evaluation of GUI Navigation ‣ 5.2 Evaluation of GUI Grounding ‣ 5.1.1 Model Configurations ‣ 5.1 Experimental Setup ‣ 5 Experiments ‣ OmegaUse: Building a General-Purpose GUI Agent for Autonomous Task Execution"), [§5.3.1](https://arxiv.org/html/2601.20380v1#S5.SS3.SSS1.40.40.40.6.1.3.1.1 "5.3.1 Standard Benchmark ‣ 5.3 Evaluation of GUI Navigation ‣ 5.2 Evaluation of GUI Grounding ‣ 5.1.1 Model Configurations ‣ 5.1 Experimental Setup ‣ 5 Experiments ‣ OmegaUse: Building a General-Purpose GUI Agent for Autonomous Task Execution"), [§5.3.1](https://arxiv.org/html/2601.20380v1#S5.SS3.SSS1.40.40.40.tab1.33.1.3.3.1 "5.3.1 Standard Benchmark ‣ 5.3 Evaluation of GUI Navigation ‣ 5.2 Evaluation of GUI Grounding ‣ 5.1.1 Model Configurations ‣ 5.1 Experimental Setup ‣ 5 Experiments ‣ OmegaUse: Building a General-Purpose GUI Agent for Autonomous Task Execution"), [§5.3.1](https://arxiv.org/html/2601.20380v1#S5.SS3.SSS1.40.46.1.8.6.1 "5.3.1 Standard Benchmark ‣ 5.3 Evaluation of GUI Navigation ‣ 5.2 Evaluation of GUI Grounding ‣ 5.1.1 Model Configurations ‣ 5.1 Experimental Setup ‣ 5 Experiments ‣ OmegaUse: Building a General-Purpose GUI Agent for Autonomous Task Execution"), [§5.3.1](https://arxiv.org/html/2601.20380v1#S5.SS3.SSS1.40.46.1.9.7.1 "5.3.1 Standard Benchmark ‣ 5.3 Evaluation of GUI Navigation ‣ 5.2 Evaluation of GUI Grounding ‣ 5.1.1 Model Configurations ‣ 5.1 Experimental Setup ‣ 5 Experiments ‣ OmegaUse: Building a General-Purpose GUI Agent for Autonomous Task Execution").
*   \[34\] C. Rawles, S. Clinckemaillie, Y. Chang, J. Waltz, G. Lau, M. Fair, A. Li, W. Bishop, W. Li, F. Campbell-Ajala, et al. (2024) Androidworld: a dynamic benchmarking environment for autonomous agents. arXiv preprint arXiv:2405.14573. Cited by: [§5.3.1](https://arxiv.org/html/2601.20380v1#S5.SS3.SSS1.p1.1 "5.3.1 Standard Benchmark ‣ 5.3 Evaluation of GUI Navigation ‣ 5.2 Evaluation of GUI Grounding ‣ 5.1.1 Model Configurations ‣ 5.1 Experimental Setup ‣ 5 Experiments ‣ OmegaUse: Building a General-Purpose GUI Agent for Autonomous Task Execution").
*   \[35\] C. Rawles, A. Li, D. Rodriguez, O. Riva, and T. Lillicrap (2023) Androidinthewild: a large-scale dataset for android device control. Advances in Neural Information Processing Systems 36, pp. 59708–59728. Cited by: [§3.2.2](https://arxiv.org/html/2601.20380v1#S3.SS2.SSS2.p2.1 "3.2.2 Hierarchical Navigation Data Pipeline ‣ 3.2 OmegaUse: Advanced Planning and Navigation ‣ 3 Methodology ‣ OmegaUse: Building a General-Purpose GUI Agent for Autonomous Task Execution").
*   \[36\] B. Seed (2025) UI-tars-1.5. Note: [https://seed-tars.com/1.5](https://seed-tars.com/1.5) Cited by: [§5](https://arxiv.org/html/2601.20380v1#S5.1.1.1.6.5.1 "5 Experiments ‣ OmegaUse: Building a General-Purpose GUI Agent for Autonomous Task Execution"), [§5.2](https://arxiv.org/html/2601.20380v1#S5.SS2.1.1.1.31.30.1 "5.2 Evaluation of GUI Grounding ‣ 5.1.1 Model Configurations ‣ 5.1 Experimental Setup ‣ 5 Experiments ‣ OmegaUse: Building a General-Purpose GUI Agent for Autonomous Task Execution"), [§5.2](https://arxiv.org/html/2601.20380v1#S5.SS2.1.1.1.7.6.1 "5.2 Evaluation of GUI Grounding ‣ 5.1.1 Model Configurations ‣ 5.1 Experimental Setup ‣ 5 Experiments ‣ OmegaUse: Building a General-Purpose GUI Agent for Autonomous Task Execution"), [§5.3.1](https://arxiv.org/html/2601.20380v1#S5.SS3.SSS1.12.12.12.12.12.4 "5.3.1 Standard Benchmark ‣ 5.3 Evaluation of GUI Navigation ‣ 5.2 Evaluation of GUI Grounding ‣ 5.1.1 Model Configurations ‣ 5.1 Experimental Setup ‣ 5 Experiments ‣ OmegaUse: Building a General-Purpose GUI Agent for Autonomous Task Execution"), [§5.3.1](https://arxiv.org/html/2601.20380v1#S5.SS3.SSS1.40.40.40.6.1.4.2.1 "5.3.1 Standard Benchmark ‣ 5.3 Evaluation of GUI Navigation ‣ 5.2 Evaluation of GUI Grounding ‣ 5.1.1 Model Configurations ‣ 5.1 Experimental Setup ‣ 5 Experiments ‣ OmegaUse: Building a General-Purpose GUI Agent for Autonomous Task Execution"), [§5.3.1](https://arxiv.org/html/2601.20380v1#S5.SS3.SSS1.40.40.40.tab1.33.1.4.4.1 "5.3.1 Standard Benchmark ‣ 5.3 Evaluation of GUI Navigation ‣ 5.2 Evaluation of GUI Grounding ‣ 5.1.1 Model Configurations ‣ 5.1 Experimental Setup ‣ 5 Experiments ‣ OmegaUse: Building a General-Purpose GUI Agent for Autonomous Task Execution").
*   \[37\] Z. Shao, P. Wang, Q. Zhu, et al. (2024) DeepSeekMath: pushing the limits of mathematical reasoning in open language models. arXiv preprint arXiv:2402.03300. Cited by: [§1](https://arxiv.org/html/2601.20380v1#S1.p5.1 "1 Introduction ‣ OmegaUse: Building a General-Purpose GUI Agent for Autonomous Task Execution").
*   \[38\] Q. Sun, K. Cheng, Z. Ding, et al. (2025) OS-genesis: automating gui agent trajectory construction via reverse task synthesis. arXiv preprint arXiv:2412.19723. Cited by: [§5.3.1](https://arxiv.org/html/2601.20380v1#S5.SS3.SSS1.40.46.1.7.5.1 "5.3.1 Standard Benchmark ‣ 5.3 Evaluation of GUI Navigation ‣ 5.2 Evaluation of GUI Grounding ‣ 5.1.1 Model Configurations ‣ 5.1 Experimental Setup ‣ 5 Experiments ‣ OmegaUse: Building a General-Purpose GUI Agent for Autonomous Task Execution").
*   \[39\] W. Tan, W. Zhang, X. Xu, H. Xia, Z. Ding, B. Li, B. Zhou, J. Yue, J. Jiang, Y. Li, et al. (2024) Cradle: empowering foundation agents towards general computer control. arXiv preprint arXiv:2403.03186. Cited by: [§2.2](https://arxiv.org/html/2601.20380v1#S2.SS2.p1.1 "2.2 GUI Agent Architectures: Modular Pipelines vs. Native Agents ‣ 2 Related Work ‣ OmegaUse: Building a General-Purpose GUI Agent for Autonomous Task Execution").
*   \[40\] F. Tang, Z. Gu, Z. Lu, et al. (2025) GUI-g2: gaussian reward modeling for gui grounding. arXiv preprint arXiv:2507.15846. Cited by: [§1](https://arxiv.org/html/2601.20380v1#S1.p5.1 "1 Introduction ‣ OmegaUse: Building a General-Purpose GUI Agent for Autonomous Task Execution"), [§2.1](https://arxiv.org/html/2601.20380v1#S2.SS1.p3.1 "2.1 UI Grounding and GUI Perception ‣ 2 Related Work ‣ OmegaUse: Building a General-Purpose GUI Agent for Autonomous Task Execution"), [§5](https://arxiv.org/html/2601.20380v1#S5.1.1.1.1.1 "5 Experiments ‣ OmegaUse: Building a General-Purpose GUI Agent for Autonomous Task Execution"), [§5.2](https://arxiv.org/html/2601.20380v1#S5.SS2.1.1.1.1.1 "5.2 Evaluation of GUI Grounding ‣ 5.1.1 Model Configurations ‣ 5.1 Experimental Setup ‣ 5 Experiments ‣ OmegaUse: Building a General-Purpose GUI Agent for Autonomous Task Execution").
*   \[41\] F. Tang, Y. Shen, H. Zhang, S. Chen, G. Hou, W. Zhang, W. Zhang, K. Song, W. Lu, and Y. Zhuang (2025) Think twice, click once: enhancing gui grounding via fast and slow systems. arXiv preprint arXiv:2503.06470. Cited by: [§5.2](https://arxiv.org/html/2601.20380v1#S5.SS2.1.1.1.11.10.1 "5.2 Evaluation of GUI Grounding ‣ 5.1.1 Model Configurations ‣ 5.1 Experimental Setup ‣ 5 Experiments ‣ OmegaUse: Building a General-Purpose GUI Agent for Autonomous Task Execution").
*   \[42\] J. Tang, Y. Xia, Y. Wu, Y. Hu, Y. Chen, Q. Chen, X. Xu, X. Wu, H. Lu, Y. Ma, et al. (2025) LPO: towards accurate gui agent interaction via location preference optimization. arXiv preprint arXiv:2506.09373. Cited by: [§5](https://arxiv.org/html/2601.20380v1#S5.1.1.1.23.22.1 "5 Experiments ‣ OmegaUse: Building a General-Purpose GUI Agent for Autonomous Task Execution").
*   \[43\] G. Team, W. Hong, W. Yu, X. Gu, G. Wang, G. Gan, H. Tang, J. Cheng, J. Qi, J. Ji, L. Pan, S. Duan, et al. (2025) GLM-4.1v-thinking: towards versatile multimodal reasoning with scalable reinforcement learning. External Links: 2507.01006, [Link](https://arxiv.org/abs/2507.01006) Cited by: [§5.3.1](https://arxiv.org/html/2601.20380v1#S5.SS3.SSS1.30.30.30.30.30.4 "5.3.1 Standard Benchmark ‣ 5.3 Evaluation of GUI Navigation ‣ 5.2 Evaluation of GUI Grounding ‣ 5.1.1 Model Configurations ‣ 5.1 Experimental Setup ‣ 5 Experiments ‣ OmegaUse: Building a General-Purpose GUI Agent for Autonomous Task Execution").
*   \[44\] J. Wan, S. Song, W. Yu, Y. Liu, W. Cheng, F. Huang, X. Bai, C. Yao, and Z. Yang (2024) Omniparser: a unified framework for text spotting key information extraction and table recognition. In Proceedings of the IEEE/CVF conference on computer vision and pattern recognition, pp. 15641–15653. Cited by: [§2.2](https://arxiv.org/html/2601.20380v1#S2.SS2.p1.1 "2.2 GUI Agent Architectures: Modular Pipelines vs. Native Agents ‣ 2 Related Work ‣ OmegaUse: Building a General-Purpose GUI Agent for Autonomous Task Execution").
*   \[45\] H. Wang, H. Zou, H. Song, J. Feng, J. Fang, J. Lu, L. Liu, Q. Luo, S. Liang, S. Huang, et al. (2025) Ui-tars-2 technical report: advancing gui agent with multi-turn reinforcement learning. arXiv preprint arXiv:2509.02544. Cited by: [§2.2](https://arxiv.org/html/2601.20380v1#S2.SS2.p2.1 "2.2 GUI Agent Architectures: Modular Pipelines vs. Native Agents ‣ 2 Related Work ‣ OmegaUse: Building a General-Purpose GUI Agent for Autonomous Task Execution").
*   \[46\] J. Wang, H. Xu, H. Jia, X. Zhang, M. Yan, W. Shen, J. Zhang, F. Huang, and J. Sang (2024) Mobile-agent-v2: mobile device operation assistant with effective navigation via multi-agent collaboration. Advances in Neural Information Processing Systems 37, pp. 2686–2710. Cited by: [§2.2](https://arxiv.org/html/2601.20380v1#S2.SS2.p1.1 "2.2 GUI Agent Architectures: Modular Pipelines vs. Native Agents ‣ 2 Related Work ‣ OmegaUse: Building a General-Purpose GUI Agent for Autonomous Task Execution").
*   \[47\] J. Wang, H. Xu, J. Ye, M. Yan, W. Shen, J. Zhang, F. Huang, and J. Sang (2024) Mobile-agent: autonomous multi-modal mobile device agent with visual perception. arXiv preprint arXiv:2401.16158. Cited by: [§2.2](https://arxiv.org/html/2601.20380v1#S2.SS2.p1.1 "2.2 GUI Agent Architectures: Modular Pipelines vs. Native Agents ‣ 2 Related Work ‣ OmegaUse: Building a General-Purpose GUI Agent for Autonomous Task Execution").
*   \[48\] X. Wang, B. Wang, D. Lu, J. Yang, T. Xie, J. Wang, J. Deng, X. Guo, Y. Xu, C. H. Wu, et al. (2025) Opencua: open foundations for computer-use agents. arXiv preprint arXiv:2508.09123. Cited by: [§2.2](https://arxiv.org/html/2601.20380v1#S2.SS2.p2.1 "2.2 GUI Agent Architectures: Modular Pipelines vs. Native Agents ‣ 2 Related Work ‣ OmegaUse: Building a General-Purpose GUI Agent for Autonomous Task Execution"), [§5](https://arxiv.org/html/2601.20380v1#S5.1.1.1.18.17.1 "5 Experiments ‣ OmegaUse: Building a General-Purpose GUI Agent for Autonomous Task Execution"), [§5](https://arxiv.org/html/2601.20380v1#S5.1.1.1.19.18.1 "5 Experiments ‣ OmegaUse: Building a General-Purpose GUI Agent for Autonomous Task Execution"), [§5.2](https://arxiv.org/html/2601.20380v1#S5.SS2.1.1.1.22.21.1 "5.2 Evaluation of GUI Grounding ‣ 5.1.1 Model Configurations ‣ 5.1 Experimental Setup ‣ 5 Experiments ‣ OmegaUse: Building a General-Purpose GUI Agent for Autonomous Task Execution"), [§5.2](https://arxiv.org/html/2601.20380v1#S5.SS2.1.1.1.23.22.1 "5.2 Evaluation of GUI Grounding ‣ 5.1.1 Model Configurations ‣ 5.1 Experimental Setup ‣ 5 Experiments ‣ OmegaUse: Building a General-Purpose GUI Agent for Autonomous Task Execution").
*   \[49\] Y. Wanyan, X. Zhang, H. Xu, H. Liu, J. Wang, J. Ye, Y. Kou, M. Yan, F. Huang, X. Yang, et al. (2025) Look before you leap: a gui-critic-r1 model for pre-operative error diagnosis in gui automation. arXiv preprint arXiv:2506.04614. Cited by: [§5.3.1](https://arxiv.org/html/2601.20380v1#S5.SS3.SSS1.15.15.15.15.15.4 "5.3.1 Standard Benchmark ‣ 5.3 Evaluation of GUI Navigation ‣ 5.2 Evaluation of GUI Grounding ‣ 5.1.1 Model Configurations ‣ 5.1 Experimental Setup ‣ 5 Experiments ‣ OmegaUse: Building a General-Purpose GUI Agent for Autonomous Task Execution").
*   \[50\] Q. Wu, K. Cheng, R. Yang, C. Zhang, J. Yang, H. Jiang, J. Mu, B. Peng, B. Qiao, R. Tan, et al. (2025) GUI-actor: coordinate-free visual grounding for gui agents. arXiv preprint arXiv:2506.03143. Cited by: [§2.1](https://arxiv.org/html/2601.20380v1#S2.SS1.p3.1 "2.1 UI Grounding and GUI Perception ‣ 2 Related Work ‣ OmegaUse: Building a General-Purpose GUI Agent for Autonomous Task Execution"), [§5](https://arxiv.org/html/2601.20380v1#S5.1.1.1.17.16.1 "5 Experiments ‣ OmegaUse: Building a General-Purpose GUI Agent for Autonomous Task Execution"), [§5.2](https://arxiv.org/html/2601.20380v1#S5.SS2.1.1.1.21.20.1 "5.2 Evaluation of GUI Grounding ‣ 5.1.1 Model Configurations ‣ 5.1 Experimental Setup ‣ 5 Experiments ‣ OmegaUse: Building a General-Purpose GUI Agent for Autonomous Task Execution").
*   \[51\] Z. Wu, Z. Wu, F. Xu, et al. (2024) OS-atlas: a foundation action model for generalist gui agents. arXiv preprint arXiv:2410.23218. Cited by: [§1](https://arxiv.org/html/2601.20380v1#S1.p1.1 "1 Introduction ‣ OmegaUse: Building a General-Purpose GUI Agent for Autonomous Task Execution"), [§2.1](https://arxiv.org/html/2601.20380v1#S2.SS1.p2.1 "2.1 UI Grounding and GUI Perception ‣ 2 Related Work ‣ OmegaUse: Building a General-Purpose GUI Agent for Autonomous Task Execution"), [§2.1](https://arxiv.org/html/2601.20380v1#S2.SS1.p3.1 "2.1 UI Grounding and GUI Perception ‣ 2 Related Work ‣ OmegaUse: Building a General-Purpose GUI Agent for Autonomous Task Execution"), [§3.1.1](https://arxiv.org/html/2601.20380v1#S3.SS1.SSS1.p1.1 "3.1.1 Grounding Data Pipeline ‣ 3.1 OmegaUse-G: Foundation of Visual Perception ‣ 3 Methodology ‣ OmegaUse: Building a General-Purpose GUI Agent for Autonomous Task Execution"), [§5](https://arxiv.org/html/2601.20380v1#S5.1.1.1.12.11.1 "5 Experiments ‣ OmegaUse: Building a General-Purpose GUI Agent for Autonomous Task Execution"), [§5.2](https://arxiv.org/html/2601.20380v1#S5.SS2.1.1.1.14.13.1 "5.2 Evaluation of GUI Grounding ‣ 5.1.1 Model Configurations ‣ 5.1 Experimental Setup ‣ 5 Experiments ‣ OmegaUse: Building a General-Purpose GUI Agent for Autonomous Task Execution"), [§5.3.1](https://arxiv.org/html/2601.20380v1#S5.SS3.SSS1.40.40.40.6.1.6.4.1 "5.3.1 Standard Benchmark ‣ 5.3 Evaluation of GUI Navigation ‣ 5.2 Evaluation of GUI Grounding ‣ 5.1.1 Model Configurations ‣ 5.1 Experimental Setup ‣ 5 Experiments ‣ OmegaUse: Building a General-Purpose GUI Agent for Autonomous Task Execution"), [§5.3.1](https://arxiv.org/html/2601.20380v1#S5.SS3.SSS1.40.40.40.tab1.33.1.5.5.1 "5.3.1 Standard Benchmark ‣ 5.3 Evaluation of GUI Navigation ‣ 5.2 Evaluation of GUI Grounding ‣ 5.1.1 Model Configurations ‣ 5.1 Experimental Setup ‣ 5 Experiments ‣ OmegaUse: Building a General-Purpose GUI Agent for Autonomous Task Execution"), [§5.3.1](https://arxiv.org/html/2601.20380v1#S5.SS3.SSS1.40.46.1.4.2.1 "5.3.1 Standard Benchmark ‣ 5.3 Evaluation of GUI Navigation ‣ 5.2 Evaluation of GUI Grounding ‣ 5.1.1 Model Configurations ‣ 5.1 Experimental Setup ‣ 5 Experiments ‣ OmegaUse: Building a General-Purpose GUI Agent for Autonomous Task Execution").
*   \[52\] T. Xie, J. Deng, X. Li, J. Yang, H. Wu, J. Chen, W. Hu, X. Wang, Y. Xu, Z. Wang, et al. (2025) Scaling computer-use grounding via user interface decomposition and synthesis. arXiv preprint arXiv:2505.13227. Cited by: [§5](https://arxiv.org/html/2601.20380v1#S5.1.1.1.16.15.1 "5 Experiments ‣ OmegaUse: Building a General-Purpose GUI Agent for Autonomous Task Execution"), [§5.2](https://arxiv.org/html/2601.20380v1#S5.SS2.1.1.1.20.19.1 "5.2 Evaluation of GUI Grounding ‣ 5.1.1 Model Configurations ‣ 5.1 Experimental Setup ‣ 5 Experiments ‣ OmegaUse: Building a General-Purpose GUI Agent for Autonomous Task Execution").
*   \[53\] Y. Xu, Z. Wang, J. Wang, D. Lu, T. Xie, A. Saha, D. Sahoo, T. Yu, and C. Xiong (2024) Aguvis: unified pure vision agents for autonomous gui interaction. arXiv preprint arXiv:2412.04454. Cited by: [§2.1](https://arxiv.org/html/2601.20380v1#S2.SS1.p3.1 "2.1 UI Grounding and GUI Perception ‣ 2 Related Work ‣ OmegaUse: Building a General-Purpose GUI Agent for Autonomous Task Execution"), [§3.1.1](https://arxiv.org/html/2601.20380v1#S3.SS1.SSS1.p1.1 "3.1.1 Grounding Data Pipeline ‣ 3.1 OmegaUse-G: Foundation of Visual Perception ‣ 3 Methodology ‣ OmegaUse: Building a General-Purpose GUI Agent for Autonomous Task Execution"), [§3.2.2](https://arxiv.org/html/2601.20380v1#S3.SS2.SSS2.p2.1 "3.2.2 Hierarchical Navigation Data Pipeline ‣ 3.2 OmegaUse: Advanced Planning and Navigation ‣ 3 Methodology ‣ OmegaUse: Building a General-Purpose GUI Agent for Autonomous Task Execution"), [§5](https://arxiv.org/html/2601.20380v1#S5.1.1.1.13.12.1 "5 Experiments ‣ OmegaUse: Building a General-Purpose GUI Agent for Autonomous Task Execution"), [§5.3.1](https://arxiv.org/html/2601.20380v1#S5.SS3.SSS1.40.46.1.5.3.1 "5.3.1 Standard Benchmark ‣ 5.3 Evaluation of GUI Navigation ‣ 5.2 Evaluation of GUI Grounding ‣ 5.1.1 Model Configurations ‣ 5.1 Experimental Setup ‣ 5 Experiments ‣ OmegaUse: Building a General-Purpose GUI Agent for Autonomous Task Execution"), [§5.3.1](https://arxiv.org/html/2601.20380v1#S5.SS3.SSS1.40.46.1.6.4.1 "5.3.1 Standard Benchmark ‣ 5.3 Evaluation of GUI Navigation ‣ 5.2 Evaluation of GUI Grounding ‣ 5.1.1 Model Configurations ‣ 5.1 Experimental Setup ‣ 5 Experiments ‣ OmegaUse: Building a General-Purpose GUI Agent for Autonomous Task Execution").
*   \[54\] H. Yan, J. Wang, X. Huang, Y. Shen, Z. Meng, Z. Fan, K. Tan, J. Gao, L. Shi, M. Yang, et al. (2025) Step-gui technical report. arXiv preprint arXiv:2512.15431. Cited by: [§2.2](https://arxiv.org/html/2601.20380v1#S2.SS2.p2.1 "2.2 GUI Agent Architectures: Modular Pipelines vs. Native Agents ‣ 2 Related Work ‣ OmegaUse: Building a General-Purpose GUI Agent for Autonomous Task Execution").
*   \[55\] B. Yang, K. Jin, Z. Wu, Z. Liu, Q. Sun, Z. Li, J. Xie, Z. Liu, F. Xu, K. Cheng, et al. (2026) OS-symphony: a holistic framework for robust and generalist computer-using agent. arXiv preprint arXiv:2601.07779. Cited by: [§2.2](https://arxiv.org/html/2601.20380v1#S2.SS2.p1.1 "2.2 GUI Agent Architectures: Modular Pipelines vs. Native Agents ‣ 2 Related Work ‣ OmegaUse: Building a General-Purpose GUI Agent for Autonomous Task Execution").
*   \[56\] J. Yang, H. Zhang, F. Li, X. Zou, C. Li, and J. Gao (2023) Set-of-mark prompting unleashes extraordinary visual grounding in gpt-4v. arXiv preprint arXiv:2310.11441. Cited by: [§2.1](https://arxiv.org/html/2601.20380v1#S2.SS1.p1.1 "2.1 UI Grounding and GUI Perception ‣ 2 Related Work ‣ OmegaUse: Building a General-Purpose GUI Agent for Autonomous Task Execution").
*   \[57\] Y. Yang, D. Li, Y. Dai, Y. Yang, Z. Luo, Z. Zhao, Z. Hu, J. Huang, A. Saha, Z. Chen, et al. (2025) Gta1: gui test-time scaling agent. arXiv preprint arXiv:2507.05791. Cited by: [§2.2](https://arxiv.org/html/2601.20380v1#S2.SS2.p1.1 "2.2 GUI Agent Architectures: Modular Pipelines vs. Native Agents ‣ 2 Related Work ‣ OmegaUse: Building a General-Purpose GUI Agent for Autonomous Task Execution"), [§5](https://arxiv.org/html/2601.20380v1#S5.1.1.1.25.24.1 "5 Experiments ‣ OmegaUse: Building a General-Purpose GUI Agent for Autonomous Task Execution"), [§5](https://arxiv.org/html/2601.20380v1#S5.1.1.1.26.25.1 "5 Experiments ‣ OmegaUse: Building a General-Purpose GUI Agent for Autonomous Task Execution"), [§5.2](https://arxiv.org/html/2601.20380v1#S5.SS2.1.1.1.32.31.1 "5.2 Evaluation of GUI Grounding ‣ 5.1.1 Model Configurations ‣ 5.1 Experimental Setup ‣ 5 Experiments ‣ OmegaUse: Building a General-Purpose GUI Agent for Autonomous Task Execution"), [§5.2](https://arxiv.org/html/2601.20380v1#S5.SS2.1.1.1.33.32.1 "5.2 Evaluation of GUI Grounding ‣ 5.1.1 Model Configurations ‣ 5.1 Experimental Setup ‣ 5 Experiments ‣ OmegaUse: Building a General-Purpose GUI Agent for Autonomous Task Execution").
*   \[58\] Y. Yang, Y. Wang, D. Li, Z. Luo, B. Chen, C. Huang, and J. Li (2025) Aria-ui: visual grounding for gui instructions. In Findings of the Association for Computational Linguistics: ACL 2025, pp. 22418–22433. Cited by: [§5.2](https://arxiv.org/html/2601.20380v1#S5.SS2.1.1.1.13.12.1 "5.2 Evaluation of GUI Grounding ‣ 5.1.1 Model Configurations ‣ 5.1 Experimental Setup ‣ 5 Experiments ‣ OmegaUse: Building a General-Purpose GUI Agent for Autonomous Task Execution"), [§5.3.1](https://arxiv.org/html/2601.20380v1#S5.SS3.SSS1.24.24.24.24.24.4 "5.3.1 Standard Benchmark ‣ 5.3 Evaluation of GUI Navigation ‣ 5.2 Evaluation of GUI Grounding ‣ 5.1.1 Model Configurations ‣ 5.1 Experimental Setup ‣ 5 Experiments ‣ OmegaUse: Building a General-Purpose GUI Agent for Autonomous Task Execution").
*   \[59\] J. Ye, X. Zhang, H. Xu, H. Liu, J. Wang, Z. Zhu, Z. Zheng, F. Gao, J. Cao, Z. Lu, et al. (2025) Mobile-agent-v3: fundamental agents for gui automation. arXiv preprint arXiv:2508.15144. Cited by: [§2.2](https://arxiv.org/html/2601.20380v1#S2.SS2.p1.1 "2.2 GUI Agent Architectures: Modular Pipelines vs. Native Agents ‣ 2 Related Work ‣ OmegaUse: Building a General-Purpose GUI Agent for Autonomous Task Execution").
*   \[60\] X. Yuan, J. Zhang, K. Li, Z. Cai, L. Yao, J. Chen, E. Wang, Q. Hou, J. Chen, P. Jiang, et al. (2025) Enhancing visual grounding for gui agents via self-evolutionary reinforcement learning. arXiv preprint arXiv:2505.12370. Cited by: [§5](https://arxiv.org/html/2601.20380v1#S5.1.1.1.22.21.1 "5 Experiments ‣ OmegaUse: Building a General-Purpose GUI Agent for Autonomous Task Execution"), [§5.2](https://arxiv.org/html/2601.20380v1#S5.SS2.1.1.1.29.28.1 "5.2 Evaluation of GUI Grounding ‣ 5.1.1 Model Configurations ‣ 5.1 Experimental Setup ‣ 5 Experiments ‣ OmegaUse: Building a General-Purpose GUI Agent for Autonomous Task Execution").
*   \[61\] H. Zhang, M. Gao, Z. Gan, P. Dufter, N. Wenzel, F. Huang, D. Shah, X. Du, B. Zhang, Y. Li, et al. (2024) Mm1.5: methods, analysis & insights from multimodal llm fine-tuning. arXiv preprint arXiv:2409.20566. Cited by: [§2.1](https://arxiv.org/html/2601.20380v1#S2.SS1.p2.1 "2.1 UI Grounding and GUI Perception ‣ 2 Related Work ‣ OmegaUse: Building a General-Purpose GUI Agent for Autonomous Task Execution").
*   \[62\] M. Zhang, Z. Xu, J. Zhu, Q. Dai, K. Qiu, Y. Yang, C. Luo, T. Chen, J. Wagle, T. Franklin, et al. (2025) Phi-ground tech report: advancing perception in gui grounding. arXiv preprint arXiv:2507.23779. Cited by: [§5](https://arxiv.org/html/2601.20380v1#S5.1.1.1.24.23.1 "5 Experiments ‣ OmegaUse: Building a General-Purpose GUI Agent for Autonomous Task Execution"), [§5.2](https://arxiv.org/html/2601.20380v1#S5.SS2.1.1.1.30.29.1 "5.2 Evaluation of GUI Grounding ‣ 5.1.1 Model Configurations ‣ 5.1 Experimental Setup ‣ 5 Experiments ‣ OmegaUse: Building a General-Purpose GUI Agent for Autonomous Task Execution").
*   \[63\] Z. Zhang, Y. Lu, Y. Fu, et al. (2025) AgentCPM-gui: building mobile-use agents with reinforcement fine-tuning. arXiv preprint arXiv:2506.01391. Cited by: [§2.2](https://arxiv.org/html/2601.20380v1#S2.SS2.p2.1 "2.2 GUI Agent Architectures: Modular Pipelines vs. Native Agents ‣ 2 Related Work ‣ OmegaUse: Building a General-Purpose GUI Agent for Autonomous Task Execution"), [§5.3.1](https://arxiv.org/html/2601.20380v1#S5.SS3.SSS1.40.40.40.6.1.8.6.1 "5.3.1 Standard Benchmark ‣ 5.3 Evaluation of GUI Navigation ‣ 5.2 Evaluation of GUI Grounding ‣ 5.1.1 Model Configurations ‣ 5.1 Experimental Setup ‣ 5 Experiments ‣ OmegaUse: Building a General-Purpose GUI Agent for Autonomous Task Execution"), [§5.3.1](https://arxiv.org/html/2601.20380v1#S5.SS3.SSS1.40.46.1.13.11.1 "5.3.1 Standard Benchmark ‣ 5.3 Evaluation of GUI Navigation ‣ 5.2 Evaluation of GUI Grounding ‣ 5.1.1 Model Configurations ‣ 5.1 Experimental Setup ‣ 5 Experiments ‣ OmegaUse: Building a General-Purpose GUI Agent for Autonomous Task Execution").
*   \[64\] H. Zhou, X. Zhang, P. Tong, J. Zhang, L. Chen, Q. Kong, C. Cai, C. Liu, Y. Wang, J. Zhou, et al. (2025) MAI-ui technical report: real-world centric foundation gui agents. arXiv preprint arXiv:2512.22047. Cited by: [§2.2](https://arxiv.org/html/2601.20380v1#S2.SS2.p2.1 "2.2 GUI Agent Architectures: Modular Pipelines vs. Native Agents ‣ 2 Related Work ‣ OmegaUse: Building a General-Purpose GUI Agent for Autonomous Task Execution").
*   \[65\] Y. Zhou, S. Dai, S. Wang, et al. (2025) GUI-g1: understanding r1-zero-like training for visual grounding in gui agents. arXiv preprint arXiv:2505.15810. Cited by: [§1](https://arxiv.org/html/2601.20380v1#S1.p5.1 "1 Introduction ‣ OmegaUse: Building a General-Purpose GUI Agent for Autonomous Task Execution"), [§5.2](https://arxiv.org/html/2601.20380v1#S5.SS2.1.1.1.28.27.1 "5.2 Evaluation of GUI Grounding ‣ 5.1.1 Model Configurations ‣ 5.1 Experimental Setup ‣ 5 Experiments ‣ OmegaUse: Building a General-Purpose GUI Agent for Autonomous Task Execution").
