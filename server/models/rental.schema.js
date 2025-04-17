//rental.schema.js

const AWS = require('aws-sdk');

// Configura o cliente do DynamoDB local
const dynamoDb = new AWS.DynamoDB.DocumentClient({
  region: 'us-west-2',
  endpoint: 'http://localhost:8000'
});

// Nome da tabela
const TABLE_NAME = 'rentals';

module.exports = {
  // Listar todos os registros
  getAll: async () => {
    const params = {
      TableName: TABLE_NAME
    };

    const data = await dynamoDb.scan(params).promise();
    return data.Items;
  },

  // Criar um novo registro
  create: async (item) => {
    const params = {
      TableName: TABLE_NAME,
      Item: item
    };

    await dynamoDb.put(params).promise();
  },

  // Atualizar um registro
  update: async (id, updatedFields) => {
    const params = {
      TableName: TABLE_NAME,
      Key: { id }, // Certifique-se de que o campo `id` está presente no item
      UpdateExpression: 'set rent = :rent, sqft = :sqft, city = :city',
      ExpressionAttributeValues: {
        ':rent': updatedFields.rent,
        ':sqft': updatedFields.sqft,
        ':city': updatedFields.city
      }
    };

    await dynamoDb.update(params).promise();
  },

  // Remover um registro
  delete: async (id) => {
    const params = {
      TableName: TABLE_NAME,
      Key: { id }
    };

    await dynamoDb.delete(params).promise();
  }
};
