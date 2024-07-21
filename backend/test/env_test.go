package test

import (
	"fmt"
	"testing"

	"github.com/spf13/viper"
)

func TestViper(t *testing.T) {
	fmt.Println("TestViper")
	viper.AutomaticEnv()
	exampleVar := viper.GetString("ProgramData")
	fmt.Println(exampleVar)
}
