// Tab Switching Logic
const tabs = document.querySelectorAll('.tab');
const contents = document.querySelectorAll('.tab-content');

tabs.forEach(tab => {
    tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active'));
        contents.forEach(c => c.classList.remove('active'));

        tab.classList.add('active');
        document.getElementById(tab.dataset.tab).classList.add('active');
    });
});

// Generic File Handler
function setupUpload(dropZoneId, fileInputId, btnId, statusId, acceptType, endpoint, filePrefix) {
    const dropZone = document.getElementById(dropZoneId);
    const fileInput = document.getElementById(fileInputId);
    const uploadBtn = document.getElementById(btnId);
    const statusDiv = document.getElementById(statusId);
    let selectedFile = null;

    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('dragover');
    });

    dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('dragover');
        handleFiles(e.dataTransfer.files);
    });

    dropZone.addEventListener('click', () => fileInput.click());

    fileInput.addEventListener('change', (e) => handleFiles(e.target.files));

    function handleFiles(files) {
        if (files.length > 0) {
            const file = files[0];
            const isValid = acceptType === '.docx' 
                ? (file.name.endsWith('.docx') || file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document")
                : (file.name.endsWith('.pdf') || file.type === "application/pdf");

            if (isValid) {
                selectedFile = file;
                statusDiv.innerHTML = `Selected: <strong>${file.name}</strong>`;
                statusDiv.className = 'status';
                uploadBtn.disabled = false;
            } else {
                statusDiv.innerHTML = `Error: Please upload a ${acceptType} file.`;
                statusDiv.className = 'status error';
                selectedFile = null;
                uploadBtn.disabled = true;
            }
        }
    }

    uploadBtn.addEventListener('click', async () => {
        if (!selectedFile) return;

        statusDiv.innerHTML = '<span class="loader"></span>Processing...';
        statusDiv.className = 'status';
        uploadBtn.disabled = true;

        const formData = new FormData();
        formData.append('file', selectedFile);

        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                body: formData
            });

            if (response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `${filePrefix}-${selectedFile.name.replace(/\.[^/.]+$/, "")}.docx`;
                document.body.appendChild(a);
                a.click();
                a.remove();
                statusDiv.innerHTML = 'Success! Downloading file...';
                statusDiv.className = 'status success';
            } else {
                const errorText = await response.text();
                throw new Error(errorText || 'Upload failed');
            }
        } catch (error) {
            console.error(error);
            statusDiv.innerHTML = `Error: ${error.message}`;
            statusDiv.className = 'status error';
        } finally {
            uploadBtn.disabled = false;
        }
    });
}

// Initialize tools
setupUpload('drop-zone-footer', 'file-input-footer', 'btn-footer', 'status-footer', '.docx', '/upload', 'nofooter');
setupUpload('drop-zone-pdf', 'file-input-pdf', 'btn-pdf', 'status-pdf', '.pdf', '/convert-pdf', 'converted');
