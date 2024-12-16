import swaggerJSDoc from 'swagger-jsdoc';

const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'API de HelpDesk Bancario',
    version: '1.0.0',
    description: 'Documentación de la API del sistema de tickets bancarios',
    contact: {
      name: 'Soporte',
      email: 'soporte@helpdesk.com'
    }
  },
  servers: [
    {
      url: 'http://localhost:5000',
      description: 'Servidor de desarrollo'
    }
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT'
      }
    }
  }
};

const options = {
  swaggerDefinition,
  apis: ['./src/routes/*.js'], // Rutas donde buscar anotaciones
};

export const swaggerSpec = swaggerJSDoc(options); 