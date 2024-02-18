const express = require('express');
const path = require('path');
const fs = require('fs');
const cors = require('cors');

const app = express();

const folders = {
  NORMS: path.join(__dirname, 'Norms'),
  KNOWLEDGE_BASE: path.join(__dirname, 'KnowledgeBase'),
};

const logDirectory = path.join(__dirname, 'logs');

if (!fs.existsSync(logDirectory)) {
  fs.mkdirSync(logDirectory);
}

app.use(cors());

const normDirectory = folders.NORMS;
const knowledgeBaseDirectory = folders.KNOWLEDGE_BASE;

function saveIPToFile(folderName, fileName, ip) {
  const logFilePath = path.join(logDirectory, `${folderName}_${fileName}_log.txt`);
  const logData = `${new Date().toLocaleString()} - IP: ${ip}\n`;

  fs.appendFile(logFilePath, logData, (err) => {
    if (err) {
      console.error('Error saving IP address:', err);
    }
  });
}

const serveFiles = (directory, folderName) => (req, res) => {
  const { fileName } = req.params;
  const filePath = path.join(directory, decodeURIComponent(fileName));

  saveIPToFile(folderName, fileName, req.ip);

  const fileInfo = {
    folder: folderName,
    fileName: fileName,
    fullPath: filePath,
    modificationTime: fs.statSync(filePath).mtime.getTime(),
  };

  console.log(`Attempting to serve ${folderName} file:`, fileInfo);

  const fileStream = fs.createReadStream(filePath);

  fileStream.on('open', () => {
    const contentType = path.extname(filePath) === '.pdf' ? 'application/pdf' : 'text/plain';
    res.setHeader('Content-Type', contentType);

    const sanitizedFileName = fileName.replace(/[^\w\d-_.]/g, ' ');

    res.setHeader('Content-Disposition', `inline; filename=${encodeURIComponent(sanitizedFileName)}`);

    fileStream.pipe(res);
  });

  fileStream.on('error', (err) => {
    console.error(`Error reading ${folderName} file (${fileInfo.folder}/${fileInfo.fileName}):`, err);

    res.status(500).json({
      error: `An error occurred while reading the ${folderName} file (${fileInfo.folder}/${fileInfo.fileName}).`,
      details: err.message,
    });
  });
};

app.get('/allFiles', (_req, res) => {
  if (!normDirectory) {
    return res.status(400).send('Invalid folder.');
  }

  try {
    const files = fs.readdirSync(normDirectory);
    const fileList = files.map((fileName) => {
      const filePath = path.join(normDirectory, fileName);
      return {
        folder: 'NORMS',
        fileName: fileName,
        fullPath: filePath,
        modificationTime: fs.statSync(filePath).mtime.getTime(),
      };
    });

    res.json({ files: fileList });
  } catch (error) {
    console.error('Error fetching files:', error);
    res.status(500).json({ error: 'An error occurred while fetching files.', details: error.message });
  }
});

app.get('/file/Norms/:fileName', serveFiles(normDirectory, 'NORMS'));

app.get('/allKnowledgeBaseFiles', (_req, res) => {
  if (!knowledgeBaseDirectory) {
    return res.status(400).send('Invalid folder.');
  }

  try {
    const files = fs.readdirSync(knowledgeBaseDirectory);
    const fileList = files.map((fileName) => {
      const filePath = path.join(knowledgeBaseDirectory, fileName);
      return {
        folder: 'KnowledgeBase',
        fileName: fileName,
        fullPath: filePath,
        modificationTime: fs.statSync(filePath).mtime.getTime(),
      };
    });

    res.json({ files: fileList });
  } catch (error) {
    console.error('Error fetching knowledge base files:', error);
    res.status(500).json({ error: 'An error occurred while fetching knowledge base files.', details: error.message });
  }
});

app.get('/file/KnowledgeBase/:fileName', serveFiles(knowledgeBaseDirectory, 'KnowledgeBase'));

const PORT = 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
