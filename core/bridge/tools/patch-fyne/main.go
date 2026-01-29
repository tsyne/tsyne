package main

import (
	"bytes"
	"flag"
	"fmt"
	"go/ast"
	"go/format"
	"go/parser"
	"go/token"
	"log"
	"os"
	"path/filepath"

	"golang.org/x/tools/go/ast/astutil"
)

func main() {
	filePath := flag.String("file", "", "Go file to patch")
	outPath := flag.String("out", "", "Output path for patched file")
	flag.Parse()

	if *filePath == "" || *outPath == "" {
		log.Fatal("Usage: patch-fyne -file <file> -out <out>")
	}

	err := patchFile(*filePath, *outPath)
	if err != nil {
		log.Fatalf("Patch failed: %v", err)
	}

	fmt.Printf("Successfully patched %s -> %s\n", *filePath, *outPath)
}

func patchFile(srcPath, dstPath string) error {
	fset := token.NewFileSet()
	node, err := parser.ParseFile(fset, srcPath, nil, parser.ParseComments)
	if err != nil {
		return fmt.Errorf("failed to parse file: %w", err)
	}

	patched := false
	ast.Inspect(node, func(n ast.Node) bool {
		fn, ok := n.(*ast.FuncDecl)
		if !ok {
			return true
		}

		// Look for func (p *painter) Paint(obj fyne.CanvasObject, pos fyne.Position, frame fyne.Size)
		// We can be a bit more flexible with the check.
		if fn.Name.Name == "Paint" && fn.Recv != nil && len(fn.Recv.List) == 1 {
			// Check receiver type is *painter
			if star, ok := fn.Recv.List[0].Type.(*ast.StarExpr); ok {
				if ident, ok := star.X.(*ast.Ident); ok && ident.Name == "painter" {
					injectHook(fn)
					patched = true
				}
			}
		}
		return true
	})

	if !patched {
		return fmt.Errorf("could not find target function in %s", srcPath)
	}

	// Add import
	// Note: We use the actual module path from go.mod
	astutil.AddImport(fset, node, "fyne.io/fyne/v2/internal/renderhook")

	// Write output
	var buf bytes.Buffer
	if err := format.Node(&buf, fset, node); err != nil {
		return fmt.Errorf("failed to format node: %w", err)
	}

	err = os.MkdirAll(filepath.Dir(dstPath), 0755)
	if err != nil {
		return fmt.Errorf("failed to create directory: %w", err)
	}

	return os.WriteFile(dstPath, buf.Bytes(), 0644)
}

func injectHook(fn *ast.FuncDecl) {
	// renderhook.Before(obj)
	// defer renderhook.After(obj)
	
	// Assuming the first argument is 'obj' as per Fyne's source
	// func (p *painter) Paint(obj fyne.CanvasObject, ...)
	
	beforeCall := &ast.ExprStmt{
		X: &ast.CallExpr{
			Fun: &ast.SelectorExpr{
				X:   ast.NewIdent("renderhook"),
				Sel: ast.NewIdent("Before"),
			},
			Args: []ast.Expr{ast.NewIdent("obj")},
		},
	}

	afterCall := &ast.DeferStmt{
		Call: &ast.CallExpr{
			Fun: &ast.SelectorExpr{
				X:   ast.NewIdent("renderhook"),
				Sel: ast.NewIdent("After"),
			},
			Args: []ast.Expr{ast.NewIdent("obj")},
		},
	}

	// Insert at the beginning of function body
	newBody := append([]ast.Stmt{beforeCall, afterCall}, fn.Body.List...)
	fn.Body.List = newBody
}
