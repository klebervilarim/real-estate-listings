// rentals.js

const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const AWS = require('aws-sdk');

// Configuração do DynamoDB local
AWS.config.update({
    region: 'us-west-2',
    accessKeyId: 'fakeMyKeyId',
    secretAccessKey: 'fakeSecretAccessKey',
    endpoint: 'http://localhost:8000'
});

const dynamo = new AWS.DynamoDB.DocumentClient();
const TABLE_NAME = 'rentals';

// GET - listar todos os registros
router.get('/', (req, res) => {
    const params = { TableName: TABLE_NAME };

    dynamo.scan(params, (err, data) => {
        if (err) {
            console.log('Erro ao buscar registros:', err);
            res.sendStatus(500);
        } else {
            res.send(data.Items);
        }
    });
});

// GET - obter um registro por ID
router.get('/:id', (req, res) => {
    const rentalId = req.params.id;

    const params = {
        TableName: TABLE_NAME,
        Key: { id: rentalId }
    };

    dynamo.get(params, (err, data) => {
        if (err) {
            console.log('Erro ao buscar registro:', err);
            res.sendStatus(500);
        } else if (!data.Item) {
            res.status(404).json({ message: 'Registro não encontrado' });
        } else {
            res.json(data.Item);
        }
    });
});

// POST - adicionar novo registro
router.post('/', (req, res) => {
    const { city, sqft, rent } = req.body;

    const item = {
        id: uuidv4(),
        city,
        sqft,
        rent,
        __v: 0
    };

    const params = {
        TableName: TABLE_NAME,
        Item: item
    };

    dynamo.put(params, (err) => {
        if (err) {
            console.log('Erro ao salvar:', err);
            res.sendStatus(500);
        } else {
            res.status(201).json(item);
        }
    });
});

// DELETE - remover por ID
router.delete('/:id', (req, res) => {
    const rentalId = req.params.id;

    const params = {
        TableName: TABLE_NAME,
        Key: { id: rentalId }
    };

    dynamo.delete(params, (err) => {
        if (err) {
            console.log('Erro ao deletar:', err);
            res.sendStatus(500);
        } else {
            res.sendStatus(200);
        }
    });
});

// PUT - atualizar por ID (dinâmico)
router.put('/:id', async (req, res) => {
    const { id } = req.params;
    const updatedData = req.body;

    if (Object.keys(updatedData).length === 0) {
        return res.status(400).json({ error: 'Nenhum dado fornecido para atualização' });
    }

    const updateExpression = 'set ' + Object.keys(updatedData).map((k, i) => `#key${i} = :val${i}`).join(', ');
    const expressionAttributeNames = Object.keys(updatedData).reduce((acc, k, i) => {
        acc[`#key${i}`] = k;
        return acc;
    }, {});
    const expressionAttributeValues = Object.keys(updatedData).reduce((acc, k, i) => {
        acc[`:val${i}`] = updatedData[k];
        return acc;
    }, {});

    const params = {
        TableName: TABLE_NAME,
        Key: { id },
        UpdateExpression: updateExpression,
        ExpressionAttributeNames: expressionAttributeNames,
        ExpressionAttributeValues: expressionAttributeValues,
        ReturnValues: 'UPDATED_NEW'
    };

    try {
        const result = await dynamo.update(params).promise();
        res.json(result.Attributes);
    } catch (err) {
        console.error('Erro ao atualizar:', err);
        res.status(500).json({ error: 'Erro ao atualizar o registro' });
    }
});

module.exports = router;
