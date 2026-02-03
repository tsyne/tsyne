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

// ConvertShader converts GLSL 300 ES to target shader language
func ConvertShader(source string, target ShaderTarget) string {
	if target == ShaderGLSL110 {
		return convertGLSL300toGLSL110(source)
	}
	return convertGLSL300toGLSLES(source)
}

// convertGLSL300toGLSL110 converts GLSL 300 ES to GLSL 110
func convertGLSL300toGLSL110(source string) string {
	result := source

	// Remove version directive
	versionRegex := regexp.MustCompile(`(?i)#version\s+300\s+es\s*`)
	result = versionRegex.ReplaceAllString(result, "")

	// Remove precision qualifiers
	precisionRegex := regexp.MustCompile(`(?i)precision\s+(highp|mediump|lowp)\s+\w+;\s*`)
	result = precisionRegex.ReplaceAllString(result, "")

	// Remove precision prefixes
	precisionPrefixRegex := regexp.MustCompile(`\b(highp|mediump|lowp)\s+`)
	result = precisionPrefixRegex.ReplaceAllString(result, "")

	// Detect if vertex or fragment shader
	isVertex := isVertexShader(source)

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
		header = `// Converted from GLSL 300 ES to GLSL 110
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
