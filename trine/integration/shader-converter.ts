/**
 * GLSL Shader Compatibility Layer
 *
 * Converts GLSL 300 ES (WebGL2) shaders to:
 * - GLSL 110 (desktop OpenGL)
 * - GLSL ES (mobile OpenGL ES 3.0)
 */

/**
 * Convert GLSL 300 ES shader to GLSL 110 (desktop)
 * This is a simplified converter handling common patterns.
 */
export function convertGLSL300toGLSL110(source: string): string {
  let result = source;

  // Remove version directive
  result = result.replace(/#version 300 es\s*/gi, '');

  // Remove precision qualifiers (not needed in desktop GLSL)
  result = result.replace(/precision\s+(highp|mediump|lowp)\s+\w+;\s*/gi, '');
  result = result.replace(/\b(highp|mediump|lowp)\s+/gi, '');

  // Convert in/out to attribute/varying for vertex shader
  if (isVertexShader(source)) {
    // Vertex shader: in → attribute, out → varying
    result = result.replace(/\bin\s+/g, 'attribute ');
    result = result.replace(/\bout\s+/g, 'varying ');
  } else {
    // Fragment shader: in → varying, out → gl_FragColor
    result = result.replace(/\bin\s+/g, 'varying ');

    // Handle fragment shader outputs
    // out vec4 FragColor; → removed, use gl_FragColor
    result = result.replace(/out\s+vec4\s+(\w+)\s*;/g, '');

    // FragColor = ... → gl_FragColor = ...
    // Find the output variable name and replace assignments
    const outputMatch = source.match(/out\s+vec4\s+(\w+)/);
    if (outputMatch) {
      const varName = outputMatch[1];
      result = result.replace(new RegExp(varName + '\\s*=', 'g'), 'gl_FragColor=');
    } else {
      // Fallback: replace common output variable names
      result = result.replace(/FragColor\s*=/g, 'gl_FragColor=');
      result = result.replace(/outColor\s*=/g, 'gl_FragColor=');
      result = result.replace(/color\s*=/g, 'gl_FragColor=');
    }
  }

  // Convert texture() to texture2D()
  result = result.replace(/\btexture\s*\(/g, 'texture2D(');

  // Convert textureCube to textureCube (no change needed)

  // Convert textureProj to textureProj (no change needed)

  // Convert textureLod to texture2DLod (may need extension)
  result = result.replace(/\btextureLod\s*\(/g, 'texture2DLod(');

  // Convert texelFetch to texelFetch (may need extension)
  result = result.replace(/\btexelFetch\s*\(/g, 'texelFetch(');

  // Built-in variable mappings
  result = result.replace(/\bgl_FragCoord\b/g, 'gl_FragCoord');
  result = result.replace(/\bgl_VertexID\b/g, 'gl_VertexIndex'); // Note: different semantics
  result = result.replace(/\bgl_InstanceID\b/g, 'gl_InstanceIndex'); // Note: different semantics

  // Add compatibility header
  const header = `// Converted from GLSL 300 ES to GLSL 110
#define texture texture2D
#define textureCube textureCube
#define textureLod texture2DLod
#define texelFetch texelFetch

`;

  return header + result;
}

/**
 * Convert GLSL 300 ES shader to GLSL ES (mobile)
 * Mobile GLES 3.0 is very close to GLSL 300 ES
 */
export function convertGLSL300toGLSLES(source: string): string {
  let result = source;

  // Change version directive
  result = result.replace(/#version 300 es\s*/gi, '#version 300 es\n');

  // Precision qualifiers are kept for ES
  // Just add default precisions if missing
  if (!result.includes('precision highp')) {
    result = `precision highp float;
precision highp int;
` + result;
  }

  // GLES 3.0 uses same in/out as GLSL 300 ES, so minimal changes
  return result;
}

/**
 * Detect if shader is vertex or fragment
 */
function isVertexShader(source: string): boolean {
  // Heuristics to detect vertex vs fragment shader
  const looksLikeVertex = /\b(gl_Position|gl_VertexID|gl_InstanceID|attribute|varyingOut)\b/.test(
    source
  );
  const looksLikeFragment = /\b(gl_FragColor|gl_FragCoord|gl_FrontFacing|varyingIn)\b/.test(source);

  if (looksLikeVertex) return true;
  if (looksLikeFragment) return false;

  // Default to fragment shader
  return false;
}

/**
 * Apply shader conversion based on target platform
 */
export function convertShader(
  source: string,
  target: 'glsl110' | 'gles3' = 'glsl110'
): string {
  if (target === 'glsl110') {
    return convertGLSL300toGLSL110(source);
  } else {
    return convertGLSL300toGLSLES(source);
  }
}

/**
 * Test if a shader contains advanced features requiring extensions
 */
export function detectRequiredExtensions(source: string): string[] {
  const extensions: Set<string> = new Set();

  // Detect features that require extensions
  if (/\btextureLod\b/.test(source)) {
    extensions.add('EXT_shader_texture_lod');
  }
  if (/\btexelFetch\b/.test(source)) {
    extensions.add('EXT_gpu_shader4');
  }
  if (/\bintBitsToFloat\b/.test(source)) {
    extensions.add('ARB_gpu_shader5');
  }
  if (/\bfloatBitsToInt\b/.test(source)) {
    extensions.add('ARB_gpu_shader5');
  }
  if (/\bdFdx\b|\bdFdy\b|\bfwidth\b/.test(source)) {
    extensions.add('ARB_derivative_control');
  }
  if (/\bimage\w+\b/.test(source)) {
    extensions.add('ARB_shader_image_load_store');
  }

  return Array.from(extensions);
}

/**
 * Validate shader syntax (basic checks)
 */
export function validateShader(source: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Check for unmatched braces
  const openBraces = (source.match(/{/g) || []).length;
  const closeBraces = (source.match(/}/g) || []).length;
  if (openBraces !== closeBraces) {
    errors.push(`Mismatched braces: ${openBraces} open, ${closeBraces} close`);
  }

  // Check for unmatched parentheses
  const openParens = (source.match(/\(/g) || []).length;
  const closeParens = (source.match(/\)/g) || []).length;
  if (openParens !== closeParens) {
    errors.push(`Mismatched parentheses: ${openParens} open, ${closeParens} close`);
  }

  // Check for missing semicolons at end of statements (basic check)
  const lines = source.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    // Skip empty lines, comments, and preprocessor directives
    if (!line || line.startsWith('//') || line.startsWith('#')) continue;
    // Check lines that look like statements
    if (
      /^(return|break|continue|discard|)\s*.*[^{;}\s]$/.test(line) &&
      !line.endsWith('{') &&
      !line.startsWith('if') &&
      !line.startsWith('for') &&
      !line.startsWith('while')
    ) {
      // This is a very basic check and may have false positives
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
