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
    
    if (!envLoaded) {
        console.log('\n❌ No se encontró archivo .env con variables VITE_');
        return false;
    }
    
    console.log('\n📦 Variables VITE_ encontradas:');
    for (const [key, value] of Object.entries(envVars)) {
        const masked = value.length > 20 ? value.substring(0, 20) + '...' : value;
        console.log(`   ${key}=${masked}`);
    }
    
    // Verificar variables requeridas
    console.log('\n✅ Validaciones:');
    const required = ['VITE_API_URL'];
    let allOk = true;
    
    for (const key of required) {
        if (envVars[key]) {
            console.log(`   ✅ ${key}: configurado`);
        } else {
            console.log(`   ❌ ${key}: NO ENCONTRADO`);
            allOk = false;
        }
    }
    
    // Variable opcional
    if (envVars['VITE_CVLAC_BASE_URL']) {
        console.log(`   ✅ VITE_CVLAC_BASE_URL: ${envVars['VITE_CVLAC_BASE_URL']}`);
    } else {
        console.log(`   ⚪ VITE_CVLAC_BASE_URL: usará default`);
    }
    
    console.log('\n' + '='.repeat(60));
    if (allOk) {
        console.log('✅ FRONTEND CONFIGURADO CORRECTAMENTE');
        console.log('   Las variables de entorno están listas.');
    } else {
        console.log('⚠️  FALTAN VARIABLES REQUERIDAS');
    }
    console.log('='.repeat(60));
    
    return allOk;
}

testFrontendEnv();
