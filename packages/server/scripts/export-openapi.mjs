import { writeFileSync } from 'node:fs';
import { NestFactory } from '@nestjs/core';
import { SwaggerModule } from '@nestjs/swagger';
import { AppModule } from '../dist/app.module.js';
import { buildOpenApiConfig } from '../dist/common/openapi/document.js';

const app = await NestFactory.create(AppModule, { logger: false, bodyParser: false });
app.setGlobalPrefix('api');

const document = SwaggerModule.createDocument(app, buildOpenApiConfig());

writeFileSync('openapi.json', `${JSON.stringify(document, null, 2)}\n`, 'utf8');
await app.close();
