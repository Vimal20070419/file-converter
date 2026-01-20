const express = require('express');
const multer = require('multer');
const AdmZip = require('adm-zip');
const path = require('path');
const fs = require('fs');

const app = express();
const port = 3000;

// Configure Multer (memory storage for processing)
const upload = multer({ storage: multer.memoryStorage() });

app.use(express.static('public'));

app.post('/upload', upload.single('file'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).send('No file uploaded.');
        }

        const zip = new AdmZip(req.file.buffer);
        const xmlEntryName = "word/document.xml";
        const entry = zip.getEntry(xmlEntryName);

        if (!entry) {
            return res.status(400).send('Invalid DOCX structure.');
        }

        let content = zip.readAsText(entry);
        
        // Regex to remove <w:footerReference ... />
        // This tag links the document to a footer part. Removing it detaches the footer.
        // We also might want to remove <w:sectPr> definitions that contain footer references if they are specific wrappers,
        // but removing the footerReference tag itself is usually sufficient to hide it.
        // Example: <w:footerReference w:type="default" r:id="rId7"/>
        const footerRegex = /<w:footerReference[^>]*\/>/g;
        
        const newContent = content.replace(footerRegex, '');

        zip.updateFile(xmlEntryName, Buffer.from(newContent, 'utf-8'));

        const outputBuffer = zip.toBuffer();

        res.set({
            'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'Content-Disposition': `attachment; filename=nofooter-${req.file.originalname}`
        });

        res.send(outputBuffer);

    } catch (error) {
        console.error('Error processing file:', error);
        res.status(500).send('Internal Server Error');
    }
});

const { exec } = require('child_process');

// ... existing code ...

app.post('/convert-pdf', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).send('No file uploaded.');
        }

        const tempPdfPath = path.join(__dirname, `temp-${Date.now()}.pdf`);
        const tempDocxPath = path.join(__dirname, `temp-${Date.now()}.docx`);

        // Write buffer to temp file
        fs.writeFileSync(tempPdfPath, req.file.buffer);

        // Execute Python script
        exec(`python convert_pdf.py "${tempPdfPath}" "${tempDocxPath}"`, (error, stdout, stderr) => {
            if (error) {
                console.error(`exec error: ${error}`);
                console.error(`Python Output: ${stdout}`);
                console.error(`Python Errors: ${stderr}`);
                // Cleanup on error
                if (fs.existsSync(tempPdfPath)) fs.unlinkSync(tempPdfPath);
                return res.status(500).send(`Conversion failed: ${stdout} ${stderr}`);
            }

            try {
                // Read the generated docx
                if (fs.existsSync(tempDocxPath)) {
                    const docxBuffer = fs.readFileSync(tempDocxPath);

                    // Cleanup
                    fs.unlinkSync(tempPdfPath);
                    fs.unlinkSync(tempDocxPath);

                    res.set({
                        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                        'Content-Disposition': `attachment; filename=converted-${req.file.originalname.replace('.pdf', '')}.docx`
                    });

                    res.send(docxBuffer);
                } else {
                    throw new Error('Output file not generated');
                }
            } catch (err) {
                console.error('Error reading output:', err);
                if (fs.existsSync(tempPdfPath)) fs.unlinkSync(tempPdfPath);
                if (fs.existsSync(tempDocxPath)) fs.unlinkSync(tempDocxPath);
                res.status(500).send('Failed to read converted file.');
            }
        });

    } catch (error) {
        console.error('Error converting PDF:', error);
        res.status(500).send('Conversion failed.');
    }
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
