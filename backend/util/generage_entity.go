package util

import (
	"bytes"
	"fmt"
	"go/ast"
	"go/parser"
	"go/token"
	"os"
)

func GenerateEntity() {
	const entityPath = "../entity" // 修改为你的entity包的实际路径
	const outputPath = "../entity/models.go"

	fset := token.NewFileSet()
	pkgs, err := parser.ParseDir(fset, entityPath, nil, parser.ParseComments)
	if err != nil {
		fmt.Println("Failed to parse package:", err)
		return
	}

	var models []string
	for _, pkg := range pkgs {
		for _, file := range pkg.Files {
			for _, decl := range file.Decls {
				genDecl, ok := decl.(*ast.GenDecl)
				if !ok || genDecl.Tok != token.TYPE {
					continue
				}
				for _, spec := range genDecl.Specs {
					typeSpec, ok := spec.(*ast.TypeSpec)
					if !ok {
						continue
					}
					if _, ok := typeSpec.Type.(*ast.StructType); ok {
						models = append(models, typeSpec.Name.Name)
					}
				}
			}
		}
	}

	var buffer bytes.Buffer
	buffer.WriteString("package entity\n\n")
	// buffer.WriteString("import \"leaf-nest/server/entity\"\n\n") // 修改为你的entity包的实际导入路径
	buffer.WriteString("var Models = []interface{}{\n")
	for _, model := range models {
		buffer.WriteString(fmt.Sprintf("\t&%s{},\n", model))
	}
	buffer.WriteString("}\n")

	err = os.WriteFile(outputPath, buffer.Bytes(), 0644)
	if err != nil {
		fmt.Println("Failed to write output file:", err)
		return
	}

	fmt.Println("Models file generated successfully at", outputPath)
}
