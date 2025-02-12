const express = require('express');
const Minio = require("minio");
const multer = require("multer");
const app = express()
const dotenv = require('dotenv');
dotenv.config()

app.get('/', (req, res) => {
    try {
        return res.status(200).json({
            mesage: "belajar minio"
        })
    } catch (error) {
        return res.status(500).json({
            message: "internal server errror"
        })
    }
})

const minioClient = new Minio.Client({
    endPoint: `${process.env.ENDPOINT}`,
    port: process.env.PORTMINIO,
    useSSL: false,
    accessKey: process.env.ACCESSKEY,
    secretKey: process.env.SECRETKEY
});

async function listBuckets() {
    try {
        const buckets = await minioClient.listBuckets();
        console.log("Bucket yang tersedia:", buckets[0].name);
    } catch (err) {
        console.error("Error:", err);
    }
}

listBuckets();

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

app.post('/upload', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: "File tidak ditemukan" });
        }

        const bucketName = process.env.BUCKETNAME;
        const fileName = req.file.originalname;
        const fileBuffer = req.file.buffer;
        const fileSize = req.file.size;
        const contentType = req.file.mimetype;

        const bucketExists = await minioClient.bucketExists(bucketName);
        if (!bucketExists) {
            await minioClient.makeBucket(bucketName);
            console.log(`Bucket '${bucketName}' telah dibuat.`);
        }

        await minioClient.putObject(bucketName, fileName, fileBuffer, fileSize, { "Content-Type": contentType });

        return res.status(200).json({
            message: "File berhasil diunggah ke MinIO",
            fileName: fileName,
            bucket: bucketName
        });

    } catch (error) {
        console.error("Error saat upload file:", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
});

app.get('/file/:fileName', async (req, res) => {
    try {
        const bucketName = process.env.BUCKETNAME;
        const fileName = req.params.fileName;

        const metaData = await minioClient.statObject(bucketName, fileName);
        const contentType = metaData.contentType || 'application/octet-stream';

        const objectStream = await minioClient.getObject(bucketName, fileName);

        res.type(contentType);  

        objectStream.pipe(res);

    } catch (error) {
        console.error("Error saat mengambil file:", error);
        return res.status(404).json({ message: "File tidak ditemukan atau terjadi kesalahan." });
    }
});

const port = 3000; 
const host = 'localhost'

app.listen(port, host, () => {
    console.log(`server run at http://${host}:${port}`);
})
