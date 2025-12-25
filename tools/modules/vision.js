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

    setup(dropZoneId, previewContainerId, inputId) {
        this.dropZone = document.getElementById(dropZoneId);
        this.previewContainer = document.getElementById(previewContainerId);
        this.inputId = inputId;

        if (!this.dropZone || !this.previewContainer) {
            console.error('VisionController: Required elements not found');
            return;
        }

        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            this.dropZone.addEventListener(eventName, (e) => { e.preventDefault(); e.stopPropagation(); }, false);
            document.body.addEventListener(eventName, (e) => { e.preventDefault(); e.stopPropagation(); }, false);
        });

        // Visual feedback
        ['dragenter', 'dragover'].forEach(eventName => {
            this.dropZone.addEventListener(eventName, () => this.dropZone.classList.add('drag-active'), false);
        });

        ['dragleave', 'drop'].forEach(eventName => {
            this.dropZone.addEventListener(eventName, () => this.dropZone.classList.remove('drag-active'), false);
        });

        this.dropZone.addEventListener('drop', (e) => this.handleDrop(e), false);
        document.addEventListener('paste', (e) => this.handlePaste(e));

        // File Input Fallback
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = 'image/*';
        fileInput.style.display = 'none';
        fileInput.id = 'vision-file-input';
        document.body.appendChild(fileInput);

        const uploadButton = document.getElementById('image-upload-btn');
        if (uploadButton) {
            uploadButton.addEventListener('click', (e) => {
                e.preventDefault();
                fileInput.click();
            });
        }

        fileInput.addEventListener('change', (e) => {
            if (e.target.files && e.target.files[0]) this.handleFile(e.target.files[0]);
        });
    }

    handleDrop(e) {
        const dt = e.dataTransfer;
        const files = dt.files;
        if (files.length > 0) this.handleFile(files[0]);
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
        reader.readAsDataURL(file);
    }

    showPreview(base64Url, fileName) {
        if (!this.previewContainer) return;
        this.previewContainer.innerHTML = '';
        this.previewContainer.style.display = 'block'; // Show container

        const previewDiv = document.createElement('div');
        previewDiv.className = 'image-preview';
        
        const img = document.createElement('img');
        img.src = base64Url;
        img.style.maxWidth = '100px';
        img.style.maxHeight = '100px';
        img.style.borderRadius = '4px';
        
        const removeBtn = document.createElement('button');
        removeBtn.textContent = '❌';
        removeBtn.style.marginLeft = '10px';
        removeBtn.onclick = () => this.clear();
        
        previewDiv.appendChild(img);
        previewDiv.appendChild(removeBtn);
        this.previewContainer.appendChild(previewDiv);
    }

    clear() {
        this.imageBase64 = null;
        if (this.previewContainer) {
            this.previewContainer.innerHTML = '';
            this.previewContainer.style.display = 'none';
        }
        const fileInput = document.getElementById('vision-file-input');
        if (fileInput) fileInput.value = '';
    }

    getImage() {
        return this.imageBase64;
    }
}