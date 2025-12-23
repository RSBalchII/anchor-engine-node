/**
 * VisionController - Handles drag-and-drop, clipboard paste, and image preview logic
 */
export class VisionController {
    constructor() {
        this.imageBase64 = null;
        this.dropZone = null;
        this.previewContainer = null;
        this.inputId = null;
    }

    /**
     * Setup event listeners for the vision functionality
     * @param {string} dropZoneId - ID of the drop zone element
     * @param {string} previewContainerId - ID of the preview container element
     * @param {string} inputId - ID of the input element
     */
    setup(dropZoneId, previewContainerId, inputId) {
        this.dropZone = document.getElementById(dropZoneId);
        this.previewContainer = document.getElementById(previewContainerId);
        this.inputId = inputId;

        if (!this.dropZone || !this.previewContainer) {
            console.error('VisionController: Required elements not found');
            return;
        }

        // Prevent default drag behaviors
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            this.dropZone.addEventListener(eventName, this.preventDefaults, false);
            document.body.addEventListener(eventName, this.preventDefaults, false);
        });

        // Highlight drop area when item is dragged over it
        ['dragenter', 'dragover'].forEach(eventName => {
            this.dropZone.addEventListener(eventName, this.highlight, false);
        });

        ['dragleave', 'drop'].forEach(eventName => {
            this.dropZone.addEventListener(eventName, this.unhighlight, false);
        });

        // Handle dropped files
        this.dropZone.addEventListener('drop', (e) => {
            this.handleDrop(e);
        }, false);

        // Handle clipboard paste
        document.addEventListener('paste', (e) => {
            this.handlePaste(e);
        });

        // Also allow regular file input if needed
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = 'image/*';
        fileInput.style.display = 'none';
        fileInput.id = 'vision-file-input';
        document.body.appendChild(fileInput);

        // If the drop zone is clicked, it can trigger file selection
        this.dropZone.addEventListener('click', () => {
            fileInput.click();
        });

        fileInput.addEventListener('change', (e) => {
            if (e.target.files && e.target.files[0]) {
                this.handleFile(e.target.files[0]);
            }
        });
    }

    preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    highlight(e) {
        this.dropZone.classList.add('drag-over');
    }

    unhighlight(e) {
        this.dropZone.classList.remove('drag-over');
    }

    handleDrop(e) {
        const dt = e.dataTransfer;
        const files = dt.files;

        if (files.length > 0) {
            this.handleFile(files[0]);
        }
    }

    handlePaste(e) {
        const items = e.clipboardData.items;
        for (let i = 0; i < items.length; i++) {
            if (items[i].type.indexOf('image') !== -1) {
                const blob = items[i].getAsFile();
                if (blob) {
                    this.handleFile(blob);
                    break;
                }
            }
        }
    }

    /**
     * Handle a file by reading it as DataURL (Base64)
     * @param {File} file - The file to process
     */
    handleFile(file) {
        if (!file.type.match('image.*')) {
            console.error('VisionController: Only image files are supported');
            return;
        }

        const reader = new FileReader();
        
        reader.onload = (e) => {
            this.imageBase64 = e.target.result;
            this.showPreview(this.imageBase64, file.name);
        };
        
        reader.onerror = (e) => {
            console.error('VisionController: Error reading file', e);
        };
        
        reader.readAsDataURL(file);
    }

    /**
     * Show image preview in the container
     * @param {string} base64Url - The Base64 encoded image URL
     * @param {string} fileName - The original file name
     */
    showPreview(base64Url, fileName) {
        if (!this.previewContainer) return;
        
        // Clear previous preview
        this.previewContainer.innerHTML = '';
        
        // Create preview elements
        const previewDiv = document.createElement('div');
        previewDiv.className = 'image-preview';
        
        const img = document.createElement('img');
        img.src = base64Url;
        img.alt = `Preview: ${fileName}`;
        img.style.maxWidth = '200px';
        img.style.maxHeight = '150px';
        img.style.objectFit = 'contain';
        
        const caption = document.createElement('div');
        caption.textContent = `Image: ${fileName}`;
        caption.style.fontSize = 'small';
        caption.style.marginTop = '5px';
        
        const removeBtn = document.createElement('button');
        removeBtn.textContent = 'Remove Image';
        removeBtn.type = 'button';
        removeBtn.style.marginTop = '5px';
        removeBtn.onclick = () => {
            this.clear();
        };
        
        previewDiv.appendChild(img);
        previewDiv.appendChild(caption);
        previewDiv.appendChild(removeBtn);
        this.previewContainer.appendChild(previewDiv);
    }

    /**
     * Clear the current image and preview
     */
    clear() {
        this.imageBase64 = null;
        if (this.previewContainer) {
            this.previewContainer.innerHTML = '';
        }
        // If there's a file input, reset it too
        const fileInput = document.getElementById('vision-file-input');
        if (fileInput) {
            fileInput.value = '';
        }
    }

    /**
     * Get the current Base64 image string
     * @returns {string|null} The Base64 image string or null if no image is loaded
     */
    getImage() {
        return this.imageBase64;
    }
}