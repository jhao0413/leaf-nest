package entity

import (
	"gorm.io/gorm"
)

type Book struct {
	gorm.Model
	Name   string `gorm:"type:varchar(100);not null"`
	Author string `gorm:"type:varchar(100);not null;"`
}
