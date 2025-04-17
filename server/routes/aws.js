const express = require('express');
const router = express.Router();
const AWS = require('aws-sdk');

// Configuração AWS com credenciais reais
AWS.config.update({
  region: 'us-east-1',
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
});

router.get('/list-services', (req, res) => {
  res.json(['EC2', 'S3', 'Lambda']);
});

router.get('/aws/:service', async (req, res) => {
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
        launchTime: i.LaunchTime
      }));
      return res.json(instances);
    }

    if (service === 'S3') {
      const s3 = new AWS.S3();
      const buckets = await s3.listBuckets().promise();
      const details = buckets.Buckets.map(b => ({
        name: b.Name,
        arn: `arn:aws:s3:::${b.Name}`,
        creationDate: b.CreationDate
      }));
      return res.json(details);
    }

    if (service === 'Lambda') {
      const lambda = new AWS.Lambda();
      const { Functions } = await lambda.listFunctions().promise();
      const details = Functions.map(fn => ({
        name: fn.FunctionName,
        arn: fn.FunctionArn,
        creationDate: fn.LastModified
      }));
      return res.json(details);
    }

    res.status(400).json({ error: 'Serviço não suportado' });
  } catch (err) {
    console.error("❌ Erro AWS:", err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/ec2/stop', async (req, res) => {
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

router.get('/aws/status', async (req, res) => {
  const s3 = new AWS.S3();
  try {
    await s3.listBuckets().promise(); // Teste rápido e seguro
    res.json({ status: 'conectado' });
  } catch (err) {
    res.json({ status: 'desconectado', error: err.message });
  }
});


module.exports = router;
