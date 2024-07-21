package test

import (
	"leaf-nest/server/entity"
	"leaf-nest/server/util"
	"log"
	"os"
	"path/filepath"
	"testing"

	"github.com/spf13/viper"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

func TestDBCreate(t *testing.T) {
	viper.AutomaticEnv()
	dbPath := filepath.Join(os.Getenv("ProgramData"), "leaf_nest.db")
	log.Println(dbPath)

	if _, err := os.Stat(dbPath); os.IsNotExist(err) {
		db, err := gorm.Open(sqlite.Open(dbPath), &gorm.Config{})
		if err != nil {
			log.Fatalf("Failed to create database: %v", err)
		}

		log.Println("Database created successfully.")

		util.GenerateEntity()

		for _, model := range entity.Models {
			err = db.AutoMigrate(model)
			if err != nil {
				log.Fatalf("Failed to auto-migrate for model %v: %v", model, err)
			}
		}
		if err != nil {
			log.Fatalf("Failed to auto-migrate: %v", err)
		}
	} else {
		log.Println("Database already exists.")
	}
}
