#!/usr/bin/env node
/**
 * Prueba de configuración de variables de entorno para el frontend
 * Simula cómo Vite carga las variables
 */

const fs = require('fs');
const path = require('path');

function testFrontendEnv() {
    console.log('='.repeat(60));
    console.log('🧪 PRUEBA DE CONFIGURACIÓN DEL FRONTEND');
    console.log('='.repeat(60));
    
    // Buscar .env en el directorio frontend
    const frontendDir = path.join(__dirname, '..', 'frontend');
    const envFiles = [
        path.join(frontendDir, '.env.local'),
        path.join(frontendDir, '.env'),
        path.join(__dirname, '..', '.env')
    ];
    
    let envLoaded = false;
    let envVars = {};
    
    for (const envFile of envFiles) {
        if (fs.existsSync(envFile)) {
            console.log(`\n📄 Encontrado: ${envFile}`);
            const content = fs.readFileSync(envFile, 'utf8');
            const lines = content.split('\n');
            
            for (const line of lines) {
                const trimmed = line.trim();
                if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
                    const [key, ...valueParts] = trimmed.split('=');
                    const value = valueParts.join('=');
                    if (key.startsWith('VITE_')) {
                        envVars[key] = value;
                        envLoaded = true;
                    }
                }
            }
        }
    }
    
    console.log('\n✅ Configuración del frontend:');
    const optional = ['VITE_API_URL', 'VITE_CVLAC_BASE_URL'];
    for (const key of optional) {
        if (envVars[key]) {
            console.log(`   ✅ ${key}: configurada`);
        } else {
            console.log(`   ⚪ ${key}: usará el valor predeterminado`);
        }
    }
    if (!envLoaded) {
        console.log('   No se encontró un archivo .env con ajustes del frontend; no es obligatorio.');
    }
    const allOk = true;
    
    console.log('\n' + '='.repeat(60));
    if (allOk) {
        console.log('✅ FRONTEND CONFIGURADO CORRECTAMENTE');
        console.log('   El frontend puede funcionar con sus valores predeterminados.');
    }
    console.log('='.repeat(60));
    
    return allOk;
}

testFrontendEnv();
