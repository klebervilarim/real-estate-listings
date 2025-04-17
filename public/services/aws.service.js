//aws.service.js
const express = require('express');
const router = express.Router();
const AWS = require('aws-sdk');

// Configure suas credenciais AWS
AWS.config.update({
    region: process.env.AWS_REGION || 'us-east-1',
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
});

router.get('/list-services', async (req, res) => {
  try {
    const services = ['EC2', 'S3', 'Lambda'];
    res.json(services);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Dados do serviço selecionado
router.get('/aws/:service', async (req, res) => {
  const service = req.params.service;

  try {
    if (service === 'EC2') {
      const ec2 = new AWS.EC2();
      const { Reservations } = await ec2.describeInstances().promise();

      const instances = Reservations.flatMap(r => r.Instances).map(i => ({
        id: i.InstanceId,
        name: (i.Tags || []).find(t => t.Key === 'Name')?.Value || '(sem nome)',
        state: i.State.Name,
        publicIp: i.PublicIpAddress || '-',
        privateIp: i.PrivateIpAddress || '-',
        launchTime: i.LaunchTime,
        arn: i.InstanceId // Usando InstanceId como ARN simplificado
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
    console.error('❌ Erro ao buscar dados do serviço:', err);
    res.status(500).json({ error: err.message });
  }
});

// Desliga instância EC2
router.post('/ec2/stop', async (req, res) => {
  const { instanceId } = req.body;
  const ec2 = new AWS.EC2();

  try {
    await ec2.stopInstances({ InstanceIds: [instanceId] }).promise();
    res.json({ message: `Instância ${instanceId} desligada com sucesso.` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
