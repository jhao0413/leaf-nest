package entity

import (
	"gorm.io/gorm"
)

type User struct {
	gorm.Model
	UserName string `gorm:"size:10;not null"`
	Password string `gorm:"size:16;not null"`
}
