const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const AWS = require('aws-sdk');
const { v4: uuidv4 } = require('uuid');
const axios = require('axios');
const AdmZip = require('adm-zip');
const path = require('path');
require('dotenv').config();

// Logs para debug
console.log('🔐 AWS_ACCESS_KEY_ID:', process.env.AWS_ACCESS_KEY_ID);
console.log('🌎 AWS_REGION:', process.env.AWS_REGION);

// ===================
// Configuração DynamoDB local
// ===================
const dynamodb = new AWS.DynamoDB.DocumentClient({
    region: 'us-east-1',
    endpoint: 'http://localhost:8000'
});
const tableName = "rentals";

// ===================
// Middleware
// ===================
app.use(express.static('public'));
app.use(bodyParser.json());

// ===================
// Rotas DynamoDB
// ===================
app.get('/rentals', async (req, res) => {
    try {
        const data = await dynamodb.scan({ TableName: tableName }).promise();
        res.json(data.Items);
    } catch (err) {
        console.error("❌ Erro ao buscar rentals:", err);
        res.status(500).send("Erro ao buscar rentals");
    }
});

app.post('/rentals', async (req, res) => {
    const { city, sqft, rent } = req.body;
    if (!city || !sqft || !rent) {
        return res.status(400).json({ error: 'Campos obrigatórios: city, sqft, rent' });
    }

    const rental = { id: uuidv4(), city, sqft, rent, __v: 0 };

    try {
        await dynamodb.put({ TableName: tableName, Item: rental }).promise();
        res.status(201).json(rental);
    } catch (err) {
        console.error("❌ Erro ao salvar rental:", err);
        res.status(500).send("Erro ao salvar rental");
    }
});

app.put('/rentals/:id', async (req, res) => {
    const rentalId = req.params.id;
    const updatedData = req.body;

    if (Object.keys(updatedData).length === 0) {
        return res.status(400).json({ error: 'Nenhum dado para atualizar' });
    }

    const updateExpr = Object.keys(updatedData)
        .map((key, i) => `#f${i} = :v${i}`).join(', ');

    const ExpressionAttributeNames = Object.fromEntries(
        Object.keys(updatedData).map((key, i) => [`#f${i}`, key])
    );

    const ExpressionAttributeValues = Object.fromEntries(
        Object.entries(updatedData).map(([key, val], i) => [`:v${i}`, val])
    );

    const params = {
        TableName: tableName,
        Key: { id: rentalId },
        UpdateExpression: 'SET ' + updateExpr,
        ExpressionAttributeNames,
        ExpressionAttributeValues,
        ReturnValues: 'UPDATED_NEW'
    };

    try {
        const result = await dynamodb.update(params).promise();
        res.json(result.Attributes);
    } catch (err) {
        console.error("❌ Erro ao atualizar rental:", err);
        res.status(500).json({ error: 'Erro ao atualizar rental' });
    }
});

app.delete('/rentals/:id', async (req, res) => {
    try {
        await dynamodb.delete({ TableName: tableName, Key: { id: req.params.id } }).promise();
        res.json({ message: 'Rental deletado com sucesso' });
    } catch (err) {
        console.error("❌ Erro ao deletar rental:", err);
        res.status(500).json({ error: 'Erro ao deletar rental' });
    }
});

// ===================
// Configuração AWS real
// ===================
AWS.config.update({
    region: process.env.AWS_REGION || 'us-east-1',
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
});

// ===================
// Rotas AWS
// ===================
app.get('/api/aws/status', async (req, res) => {
    try {
        const sts = new AWS.STS();
        await sts.getCallerIdentity().promise();
        res.json({ status: 'conectado' });
    } catch (err) {
        console.error("❌ Falha na conexão AWS:", err.message);
        res.json({ status: 'desconectado' });
    }
});

app.get('/api/list-services', (req, res) => {
    res.json(['EC2', 'S3', 'Lambda']);
});

app.get('/api/aws/:service', async (req, res) => {
    const service = req.params.service;

    try {
        if (service === 'EC2') {
            const ec2 = new AWS.EC2();
            const { Reservations } = await ec2.describeInstances().promise();
            const instances = Reservations.flatMap(r => r.Instances).map(i => ({
                id: i.InstanceId,
                state: i.State.Name,
                arn: i.InstanceId,
                name: i.Tags?.find(t => t.Key === 'Name')?.Value || '',
                launchTime: i.LaunchTime,
                publicIp: i.PublicIpAddress || '',
                privateIp: i.PrivateIpAddress || ''
            }));
            return res.json(instances);
        }

        if (service === 'S3') {
            const s3 = new AWS.S3();
            const buckets = await s3.listBuckets().promise();
            return res.json(buckets.Buckets.map(b => ({
                name: b.Name,
                arn: `arn:aws:s3:::${b.Name}`,
                creationDate: b.CreationDate
            })));
        }

        if (service === 'Lambda') {
            const lambda = new AWS.Lambda();
            const { Functions } = await lambda.listFunctions().promise();
            return res.json(Functions.map(fn => ({
                name: fn.FunctionName,
                arn: fn.FunctionArn,
                creationDate: fn.LastModified
            })));
        }

        res.status(400).json({ error: 'Serviço não suportado' });
    } catch (err) {
        console.error("❌ Erro AWS:", err);
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/ec2/stop', async (req, res) => {
    const { instanceId } = req.body;
    const ec2 = new AWS.EC2();

    try {
        await ec2.stopInstances({ InstanceIds: [instanceId] }).promise();
        res.json({ message: `Instância ${instanceId} desligada com sucesso.` });
    } catch (err) {
        console.error("❌ Erro ao desligar EC2:", err);
        res.status(500).json({ error: err.message });
    }
});

// 🧠 Rota para exibir o código real da função Lambda
app.get('/api/lambda/:functionName', async (req, res) => {
    const lambda = new AWS.Lambda();
    const functionName = req.params.functionName;

    try {
        const data = await lambda.getFunction({ FunctionName: functionName }).promise();

        const zipUrl = data.Code.Location;
        const response = await axios.get(zipUrl, { responseType: 'arraybuffer' });

        const zip = new AdmZip(response.data);
        const entries = zip.getEntries();

        const codeFile = entries.find(e => {
            const ext = path.extname(e.entryName).toLowerCase();
            return ['.js', '.py', '.java', '.ts'].includes(ext) && !e.isDirectory;
        });

        if (codeFile) {
            const code = codeFile.getData().toString('utf8');
            res.json({ code });
        } else {
            res.status(404).json({ code: 'Nenhum arquivo de código (.js, .py, .java, .ts) encontrado.' });
        }

    } catch (err) {
        console.error("❌ Erro ao buscar código Lambda:", err);
        res.status(500).json({ code: 'Erro ao buscar código da função Lambda.' });
    }
});

// ===================
// Inicialização
// ===================
const port = process.env.PORT || 5000;
app.listen(port, () => {
    console.log(`🚀 Servidor rodando em http://localhost:${port}`);
});
