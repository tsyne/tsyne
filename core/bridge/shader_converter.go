package main

import (
	"regexp"
	"strings"
)

// ShaderTarget specifies the target shader language
type ShaderTarget string

const (
	ShaderGLSL110 ShaderTarget = "glsl110"  // Desktop OpenGL
	ShaderGLSLES  ShaderTarget = "gles3"    // Mobile OpenGL ES 3.0
)

// ShaderType indicates whether a shader is vertex or fragment
type ShaderType int

const (
	ShaderTypeAuto     ShaderType = iota // Auto-detect from source
	ShaderTypeVertex                     // Explicitly a vertex shader
	ShaderTypeFragment                   // Explicitly a fragment shader
)

// ConvertShader converts GLSL 300 ES to target shader language
func ConvertShader(source string, target ShaderTarget) string {
	return ConvertShaderWithType(source, target, ShaderTypeAuto)
}

// ConvertVertexShader converts a vertex shader from GLSL 300 ES to target language
func ConvertVertexShader(source string, target ShaderTarget) string {
	return ConvertShaderWithType(source, target, ShaderTypeVertex)
}

// ConvertFragmentShader converts a fragment shader from GLSL 300 ES to target language
func ConvertFragmentShader(source string, target ShaderTarget) string {
	return ConvertShaderWithType(source, target, ShaderTypeFragment)
}

// ConvertShaderWithType converts GLSL 300 ES to target shader language with explicit type
func ConvertShaderWithType(source string, target ShaderTarget, shaderType ShaderType) string {
	if target == ShaderGLSL110 {
		return convertGLSL300toGLSL110WithType(source, shaderType)
	}
	return convertGLSL300toGLSLES(source)
}

// convertGLSL300toGLSL110 converts GLSL 300 ES to GLSL 110 (auto-detect shader type)
func convertGLSL300toGLSL110(source string) string {
	return convertGLSL300toGLSL110WithType(source, ShaderTypeAuto)
}

// convertGLSL300toGLSL110WithType converts GLSL 300 ES to GLSL 110 with explicit type
func convertGLSL300toGLSL110WithType(source string, shaderType ShaderType) string {
	result := source

	// Normalize line endings (handle Windows \r\n, Mac \r, Unix \n)
	result = strings.ReplaceAll(result, "\r\n", "\n")
	result = strings.ReplaceAll(result, "\r", "\n")

	// Check if three.js has already added compatibility macros
	// Three.js adds macros to convert GLSL 110 syntax TO GLSL 300 ES:
	// - Vertex shader: #define attribute in, #define varying out
	// - Fragment shader: #define varying in, #define gl_FragColor ...
	hasThreeJSCompatMacros := strings.Contains(source, "#define attribute in") ||
		strings.Contains(source, "#define varying out") ||
		strings.Contains(source, "#define varying in") ||
		strings.Contains(source, "#define texture2D texture") ||
		strings.Contains(source, "#define textureCube texture") ||
		strings.Contains(source, "#define gl_FragColor")

	if hasThreeJSCompatMacros {
		// Three.js shader has GLSL 300 ES compatibility macros
		// We need to strip these and convert back to GLSL 110

		// Remove version directive
		versionRegex := regexp.MustCompile(`(?i)#version\s+300\s+es\s*\n?`)
		result = versionRegex.ReplaceAllString(result, "")

		// Remove entire precision statements (not supported in GLSL 110)
		precisionRegex := regexp.MustCompile(`(?m)^[\t ]*precision\s+(highp|mediump|lowp)\s+\w+;\s*\n?`)
		for precisionRegex.MatchString(result) {
			result = precisionRegex.ReplaceAllString(result, "")
		}

		// Remove precision prefixes in other statements (e.g., "highp float x")
		precisionPrefixRegex := regexp.MustCompile(`\b(highp|mediump|lowp)\s+`)
		result = precisionPrefixRegex.ReplaceAllString(result, "")

		// Remove ALL three.js compatibility macros - they're for GLSL 300 ES, not 110
		// Vertex shader macros:
		result = regexp.MustCompile(`#define attribute in\s*\n?`).ReplaceAllString(result, "")
		result = regexp.MustCompile(`#define varying out\s*\n?`).ReplaceAllString(result, "")
		// Fragment shader macros:
		result = regexp.MustCompile(`#define varying in\s*\n?`).ReplaceAllString(result, "")
		result = regexp.MustCompile(`#define texture2D texture\s*\n?`).ReplaceAllString(result, "")
		result = regexp.MustCompile(`#define textureCube texture\s*\n?`).ReplaceAllString(result, "")
		// Fragment output macros - remove completely and we'll convert the actual output
		result = regexp.MustCompile(`#define gl_FragColor\s+\w+\s*\n?`).ReplaceAllString(result, "")
		result = regexp.MustCompile(`#define gl_FragDepthEXT\s+\w+\s*\n?`).ReplaceAllString(result, "")
		// GLSL extension macros (texture lod/proj variations)
		result = regexp.MustCompile(`#define texture2DProj\s+\w+\s*\n?`).ReplaceAllString(result, "")
		result = regexp.MustCompile(`#define texture2DLodEXT\s+\w+\s*\n?`).ReplaceAllString(result, "")
		result = regexp.MustCompile(`#define texture2DProjLodEXT\s+\w+\s*\n?`).ReplaceAllString(result, "")
		result = regexp.MustCompile(`#define textureCubeLodEXT\s+\w+\s*\n?`).ReplaceAllString(result, "")
		result = regexp.MustCompile(`#define texture2DGradEXT\s+\w+\s*\n?`).ReplaceAllString(result, "")
		result = regexp.MustCompile(`#define texture2DProjGradEXT\s+\w+\s*\n?`).ReplaceAllString(result, "")
		result = regexp.MustCompile(`#define textureCubeGradEXT\s+\w+\s*\n?`).ReplaceAllString(result, "")

		// Remove GLSL 300 specific layout(...) declarations
		result = regexp.MustCompile(`layout\s*\([^)]*\)\s*`).ReplaceAllString(result, "")

		// Remove GLSL 300 out vec4 declarations (fragment output)
		// These would have been: layout(location = 0) out vec4 pc_fragColor;
		// After removing layout(), we have: out vec4 pc_fragColor;
		outDeclRegex := regexp.MustCompile(`(?m)^[\t ]*out\s+vec4\s+(\w+)\s*;\s*\n?`)
		outVarName := ""
		matches := outDeclRegex.FindStringSubmatch(result)
		if len(matches) > 1 {
			outVarName = matches[1]
		}
		result = outDeclRegex.ReplaceAllString(result, "")

		// Convert any uses of the output variable to gl_FragColor
		if outVarName != "" && outVarName != "gl_FragColor" {
			result = strings.ReplaceAll(result, outVarName, "gl_FragColor")
		}

		// Use GLSL 130 which natively supports texture() for all sampler types
		// including sampler2DShadow (needed for shadow mapping).
		// GLSL 130 also supports varying/attribute keywords for backward compat.
		result = "#version 130\n// Converted from GLSL 300 ES (three.js)\n" + result
		return result
	}

	// Standard conversion path (for shaders without three.js macros)

	// Check if shader is raw GLSL 300 ES (not from Three.js).
	// Raw WebGL2 shaders use features like layout qualifiers, sampler2DArray,
	// samplerCube with texture(), in/out syntax — all native to GLSL 330.
	// Converting to GLSL 330 is the closest match and avoids broken downgrades.
	hasVersion300ES := regexp.MustCompile(`(?i)#version\s+300\s+es`).MatchString(source)

	if hasVersion300ES {
		// Raw WebGL2 shader — convert to GLSL 330 (close to GLSL 300 ES)
		// Just change version and strip precision qualifiers; everything else is compatible
		versionRegex := regexp.MustCompile(`(?i)#version\s+300\s+es\s*\n?`)
		result = versionRegex.ReplaceAllString(result, "")

		// Remove precision statements
		precisionRegex := regexp.MustCompile(`(?m)^[\t ]*precision\s+(highp|mediump|lowp)\s+\w+;\s*\n?`)
		for precisionRegex.MatchString(result) {
			result = precisionRegex.ReplaceAllString(result, "")
		}

		// Remove precision prefixes
		precisionPrefixRegex := regexp.MustCompile(`\b(highp|mediump|lowp)\s+`)
		result = precisionPrefixRegex.ReplaceAllString(result, "")

		// Remove //[ and //] comment markers (precision block delimiters)
		result = strings.ReplaceAll(result, "//[", "")
		result = strings.ReplaceAll(result, "//]", "")

		return "#version 330\n// Converted from GLSL 300 ES to GLSL 330\n" + result
	}

	// Legacy conversion path (GLSL 300 ES → GLSL 110)

	// Remove version directive
	versionRegex := regexp.MustCompile(`(?i)#version\s+300\s+es\s*`)
	result = versionRegex.ReplaceAllString(result, "")

	// Remove precision qualifiers
	precisionRegex := regexp.MustCompile(`(?i)precision\s+(highp|mediump|lowp)\s+\w+;\s*`)
	result = precisionRegex.ReplaceAllString(result, "")

	// Remove precision prefixes
	precisionPrefixRegex := regexp.MustCompile(`\b(highp|mediump|lowp)\s+`)
	result = precisionPrefixRegex.ReplaceAllString(result, "")

	// Determine shader type
	var isVertex bool
	switch shaderType {
	case ShaderTypeVertex:
		isVertex = true
	case ShaderTypeFragment:
		isVertex = false
	default:
		isVertex = isVertexShader(source)
	}

	if isVertex {
		// Vertex shader: in → attribute, out → varying
		inRegex := regexp.MustCompile(`\bin\s+`)
		result = inRegex.ReplaceAllString(result, "attribute ")

		outRegex := regexp.MustCompile(`\bout\s+`)
		result = outRegex.ReplaceAllString(result, "varying ")
	} else {
		// Fragment shader: in → varying, out → gl_FragColor
		inRegex := regexp.MustCompile(`\bin\s+`)
		result = inRegex.ReplaceAllString(result, "varying ")

		// Remove out vec4 declarations
		outDeclRegex := regexp.MustCompile(`(?i)out\s+vec4\s+(\w+)\s*;`)
		outVarName := ""
		matches := outDeclRegex.FindStringSubmatch(source)
		if len(matches) > 1 {
			outVarName = matches[1]
		}
		result = outDeclRegex.ReplaceAllString(result, "")

		// Replace output variable assignments with gl_FragColor
		if outVarName != "" {
			assignRegex := regexp.MustCompile(outVarName + `\s*=`)
			result = assignRegex.ReplaceAllString(result, "gl_FragColor=")
		} else {
			// Fallback to common output variable names
			result = strings.ReplaceAll(result, "FragColor =", "gl_FragColor =")
			result = strings.ReplaceAll(result, "outColor =", "gl_FragColor =")
			result = strings.ReplaceAll(result, "color =", "gl_FragColor =")
		}
	}

	// Convert texture() to texture2D()
	textureRegex := regexp.MustCompile(`\btexture\s*\(`)
	result = textureRegex.ReplaceAllString(result, "texture2D(")

	// Convert textureLod to texture2DLod
	textureLodRegex := regexp.MustCompile(`\btextureLod\s*\(`)
	result = textureLodRegex.ReplaceAllString(result, "texture2DLod(")

	// Convert texelFetch to texelFetch (may need extension)
	// This one stays the same or uses texelFetch if available

	// Add compatibility header if we made changes
	header := ""
	if !strings.Contains(source, "#version 110") && !strings.Contains(source, "#version 120") {
		header = `#version 110
// Converted from GLSL 300 ES to GLSL 110
#define texture texture2D
#define textureCube textureCube
#define textureLod texture2DLod

`
	}

	return header + result
}

// convertGLSL300toGLSLES converts GLSL 300 ES to GLSL ES
func convertGLSL300toGLSLES(source string) string {
	// GLSL ES 3.0 is very similar to GLSL 300 ES
	// Just ensure precision qualifiers are present
	result := source

	// Make sure version directive is correct
	versionRegex := regexp.MustCompile(`(?i)#version\s+[0-9]+\s+es`)
	if !versionRegex.MatchString(result) {
		result = "#version 300 es\n" + result
	}

	// Ensure default precisions
	if !strings.Contains(result, "precision highp") {
		result = `precision highp float;
precision highp int;
` + result
	}

	return result
}

// isVertexShader detects if shader is vertex or fragment
func isVertexShader(source string) bool {
	// Heuristics to detect vertex vs fragment shader
	vertexMarkers := regexp.MustCompile(`\b(gl_Position|gl_VertexID|gl_InstanceID|attribute)\b`)
	fragmentMarkers := regexp.MustCompile(`\b(gl_FragColor|gl_FragCoord|gl_FrontFacing)\b`)

	if vertexMarkers.MatchString(source) {
		return true
	}
	if fragmentMarkers.MatchString(source) {
		return false
	}

	// Default to fragment shader
	return false
}

// DetectRequiredExtensions finds features that require GL extensions
func DetectRequiredExtensions(source string) []string {
	var extensions []string

	checks := map[string]*regexp.Regexp{
		"EXT_shader_texture_lod":        regexp.MustCompile(`\btextureLod\b`),
		"EXT_gpu_shader4":               regexp.MustCompile(`\btexelFetch\b`),
		"ARB_gpu_shader5":               regexp.MustCompile(`\b(intBitsToFloat|floatBitsToInt)\b`),
		"ARB_derivative_control":        regexp.MustCompile(`\b(dFdx|dFdy|fwidth)\b`),
		"ARB_shader_image_load_store":   regexp.MustCompile(`\bimage\w+\b`),
	}

	for ext, regex := range checks {
		if regex.MatchString(source) {
			extensions = append(extensions, ext)
		}
	}

	return extensions
}
