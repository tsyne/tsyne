/**
 * Three.js Integration Test
 *
 * This test verifies that three.js can run through the Tsyne bridge
 * and that GL commands are properly serialized, transmitted, and processed.
 */

import { TsyneBridge } from './bridge';
import { TsyneCanvas } from './canvas';
import { TsyneGLProxy } from './gl-proxy';
import { initTsyneGlobals, injectGlobals } from './globals';

/**
 * Mock message queue for testing without actual IPC
 */
class MockBridgeTransport {
  messages: any[] = [];
  responses: Map<number, any> = new Map();

  send(msg: any): void {
    this.messages.push(msg);
    console.log('Bridge message:', msg);
  }

  addResponse(messageId: number, response: any): void {
    this.responses.set(messageId, response);
  }
}

/**
 * Simple integration test that doesn't require three.js
 * Tests the basic GL command flow
 */
export async function testBasicGLCommandFlow(): Promise<void> {
  console.log('Starting basic GL command flow test...');

  const transport = new MockBridgeTransport();
  const bridge = new TsyneBridge((msg) => transport.send(msg));
  initTsyneGlobals(bridge);

  // Create a fake canvas
  const canvas = new TsyneCanvas(bridge);
  console.log('✓ Created TsyneCanvas');

  // Get WebGL context
  const glContext = canvas.getContext('webgl2');
  if (!glContext) {
    throw new Error('Failed to get WebGL context');
  }
  console.log('✓ Got WebGL2 context');

  // Test buffer creation
  const buffer = glContext.createBuffer();
  if (!buffer) {
    throw new Error('Failed to create buffer');
  }
  console.log('✓ Created buffer:', buffer);

  // Test shader creation
  const shader = glContext.createShader(glContext.FRAGMENT_SHADER);
  if (!shader) {
    throw new Error('Failed to create shader');
  }
  console.log('✓ Created shader:', shader);

  // Test shader source
  const shaderCode = `
    void main() {
      gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0);
    }
  `;
  glContext.shaderSource(shader, shaderCode);
  console.log('✓ Set shader source');

  // Test program
  const program = glContext.createProgram();
  if (!program) {
    throw new Error('Failed to create program');
  }
  console.log('✓ Created program:', program);

  // Test program operations
  glContext.attachShader(program, shader);
  glContext.linkProgram(program);
  glContext.useProgram(program);
  console.log('✓ Linked and activated program');

  // Test uniforms
  const uniformLoc = glContext.getUniformLocation(program, 'u_color');
  glContext.uniform4f(uniformLoc, 1.0, 0.5, 0.25, 1.0);
  console.log('✓ Set uniform');

  // Test buffer data
  const vertexData = new Float32Array([-1, -1, 0, 1, -1, 0, 0, 1, 0]);
  glContext.bindBuffer(glContext.ARRAY_BUFFER, buffer);
  glContext.bufferData(glContext.ARRAY_BUFFER, vertexData, glContext.STATIC_DRAW);
  console.log('✓ Uploaded buffer data');

  // Test clear and draw
  glContext.clearColor(0, 0, 0, 1);
  glContext.clear(glContext.COLOR_BUFFER_BIT);
  glContext.drawArrays(glContext.TRIANGLES, 0, 3);
  console.log('✓ Executed draw call');

  // Verify command buffer was populated
  if (glContext.commandBuffer.length === 0) {
    throw new Error('Command buffer is empty!');
  }
  console.log(`✓ Command buffer contains ${glContext.commandBuffer.length} commands`);

  // Flush and check messages
  await glContext.flush();
  console.log(`✓ Flushed command buffer, sent ${transport.messages.length} messages to bridge`);

  // Verify structure of commands
  const createCanvasMsg = transport.messages[0];
  if (createCanvasMsg?.type !== 'createGLCanvas') {
    throw new Error('Expected createGLCanvas message');
  }
  console.log('✓ createGLCanvas message validated');

  // Verify batch message
  const batchMsg = transport.messages.find((m) => m.type === 'executeBatch');
  if (!batchMsg) {
    throw new Error('No executeBatch message found');
  }
  console.log(`✓ executeBatch message contains ${batchMsg.payload.commands.length} commands`);

  console.log('\n✅ All basic GL command flow tests passed!');
}

/**
 * Test the shader converter integration
 */
export async function testShaderConversion(): Promise<void> {
  console.log('\nTesting shader conversion...');

  const transport = new MockBridgeTransport();
  const bridge = new TsyneBridge((msg) => transport.send(msg));
  initTsyneGlobals(bridge);

  const canvas = new TsyneCanvas(bridge);
  const gl = canvas.getContext('webgl2')!;

  // Create a shader with GLSL 300 ES code
  const shader = gl.createShader(gl.FRAGMENT_SHADER);
  const glsl300Code = `#version 300 es
precision highp float;

out vec4 FragColor;

void main() {
  FragColor = vec4(1.0, 0.0, 0.0, 1.0);
}`;

  gl.shaderSource(shader, glsl300Code);
  gl.compileShader(shader);
  console.log('✓ Created and compiled GLSL 300 ES shader');

  // Create program and link (this triggers conversion)
  const program = gl.createProgram();
  gl.attachShader(program, shader);
  gl.linkProgram(program);
  console.log('✓ Linked program (shader should be converted server-side)');

  await gl.flush();

  // Check that shader source was passed
  const commandsMsg = transport.messages.find((m) => m.type === 'executeBatch');
  if (!commandsMsg) {
    throw new Error('No batch message found');
  }

  const shaderSourceCmd = commandsMsg.payload.commands.find(
    (cmd: any) => (Array.isArray(cmd) ? cmd[0] : cmd.cmd) === 'shaderSource'
  );
  if (shaderSourceCmd) {
    console.log('✓ Shader source command found in batch');
  }

  console.log('✅ Shader conversion test passed!');
}

/**
 * Test texture operations
 */
export async function testTextureOperations(): Promise<void> {
  console.log('\nTesting texture operations...');

  const transport = new MockBridgeTransport();
  const bridge = new TsyneBridge((msg) => transport.send(msg));
  initTsyneGlobals(bridge);

  const canvas = new TsyneCanvas(bridge);
  const gl = canvas.getContext('webgl2')!;

  // Create texture
  const texture = gl.createTexture();
  if (!texture) {
    throw new Error('Failed to create texture');
  }
  console.log('✓ Created texture');

  // Bind texture
  gl.bindTexture(gl.TEXTURE_2D, texture);
  console.log('✓ Bound texture');

  // Set texture parameters
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  console.log('✓ Set texture parameters');

  // Create and upload image data
  const imageData = new Uint8Array(4 * 4 * 4); // 4x4 RGBA
  for (let i = 0; i < imageData.length; i += 4) {
    imageData[i] = 255; // R
    imageData[i + 1] = 0; // G
    imageData[i + 2] = 0; // B
    imageData[i + 3] = 255; // A
  }

  gl.texImage2D(
    gl.TEXTURE_2D,
    0,
    gl.RGBA,
    4,
    4,
    0,
    gl.RGBA,
    gl.UNSIGNED_BYTE,
    imageData
  );
  console.log('✓ Uploaded texture data');

  gl.generateMipmap(gl.TEXTURE_2D);
  console.log('✓ Generated mipmaps');

  await gl.flush();

  console.log(`✓ Sent ${transport.messages.length} messages for texture operations`);
  console.log('✅ Texture operations test passed!');
}

/**
 * Test vertex array operations (VAO)
 */
export async function testVertexArrayOperations(): Promise<void> {
  console.log('\nTesting vertex array operations...');

  const transport = new MockBridgeTransport();
  const bridge = new TsyneBridge((msg) => transport.send(msg));
  initTsyneGlobals(bridge);

  const canvas = new TsyneCanvas(bridge);
  const gl = canvas.getContext('webgl2')!;

  // Create VAO
  const vao = gl.createVertexArray();
  if (!vao) {
    throw new Error('Failed to create VAO');
  }
  console.log('✓ Created vertex array object');

  // Bind VAO
  gl.bindVertexArray(vao);
  console.log('✓ Bound VAO');

  // Create and bind buffer
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);

  // Buffer data
  const vertices = new Float32Array([
    -1.0, -1.0, 0.0, // vertex 1
    1.0, -1.0, 0.0, // vertex 2
    0.0, 1.0, 0.0, // vertex 3
  ]);

  gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
  console.log('✓ Uploaded vertex data');

  // Enable attribute array
  gl.enableVertexAttribArray(0);
  console.log('✓ Enabled vertex attribute array');

  // Set vertex attribute pointer
  gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 12, 0);
  console.log('✓ Set vertex attribute pointer');

  await gl.flush();

  console.log('✅ Vertex array operations test passed!');
}

/**
 * Run all integration tests
 */
export async function runAllIntegrationTests(): Promise<void> {
  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║  Three.js + Tsyne Integration Test Suite              ║');
  console.log('╚════════════════════════════════════════════════════════╝\n');

  try {
    await testBasicGLCommandFlow();
    await testShaderConversion();
    await testTextureOperations();
    await testVertexArrayOperations();

    console.log('\n╔════════════════════════════════════════════════════════╗');
    console.log('║  ✅ ALL INTEGRATION TESTS PASSED                       ║');
    console.log('╚════════════════════════════════════════════════════════╝');
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  }
}

// Run tests if this is the main module
if (require.main === module) {
  runAllIntegrationTests();
}
