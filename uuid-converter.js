#!/usr/bin/env node

// Cocos Creator UUID 转换工具
// UUID 格式: 1c7f5220-200c-4d52-8036-63e25ec9d111
// Cocos 格式: 使用 base64 编码的压缩格式

function uuidToCocos(uuid) {
    // 移除连字符
    const hex = uuid.replace(/-/g, '');

    // 转换为 Buffer
    const buffer = Buffer.from(hex, 'hex');

    // 转换为 base64
    let base64 = buffer.toString('base64');

    // Cocos Creator 使用修改过的 base64:
    // + 替换为 I
    // / 替换为 g
    // 移除 =
    base64 = base64.replace(/\+/g, 'I').replace(/\//g, 'g').replace(/=/g, '');

    return base64;
}

function cocosToUuid(cocos) {
    // 反向转换
    let base64 = cocos.replace(/I/g, '+').replace(/g/g, '/');

    // 添加 padding
    while (base64.length % 4 !== 0) {
        base64 += '=';
    }

    // 转换为 Buffer
    const buffer = Buffer.from(base64, 'base64');

    // 转换为 hex
    const hex = buffer.toString('hex');

    // 添加连字符
    return `${hex.substr(0, 8)}-${hex.substr(8, 4)}-${hex.substr(12, 4)}-${hex.substr(16, 4)}-${hex.substr(20, 12)}`;
}

// 测试
const gameManagerUuid = '1c7f5220-200c-4d52-8036-63e25ec9d111';
const playerControllerUuid = '5331434f-dc9a-4ccc-8744-841ea7858f8a';

console.log('GameManager UUID:', gameManagerUuid);
console.log('GameManager Cocos:', uuidToCocos(gameManagerUuid));
console.log('');
console.log('PlayerController UUID:', playerControllerUuid);
console.log('PlayerController Cocos:', uuidToCocos(playerControllerUuid));
console.log('');

// 验证场景中的编码
const sceneCocos = '1c7f5IgIAxNUoA2Y+JeydER';
console.log('Scene encoded:', sceneCocos);
console.log('Decoded UUID:', cocosToUuid(sceneCocos));
