package main

import (
	"encoding/json"
	"fmt"
	"github.com/pelletier/go-toml/v2"
	"log"
	"os"
	"time"
)

func main() {
	var (
		cat = new(Catalogue)
	)

	b, err := os.ReadFile("./miner/catalogs/lib-tech.toml")
	if err != nil {
		log.Fatal(err)
	}

	if err := toml.Unmarshal(b, cat); err != nil {
		log.Fatal(err)
	}

	fmt.Printf("catalogue: %#v\n", cat)

	var (
		res = make([]*Snowboard, 0)
	)

	for _, list := range cat.Snowboards {
		for _, u := range list.Urls {
			defs := Snowboard{
				BrandName: cat.BrandName,
				Season:    cat.Season,
			}

			defs.Riders = list.Riders

			sn, err := gnu(u, defs)
			if err != nil {
				log.Fatal(err)
			}

			res = append(res, sn)

			time.Sleep(1 * time.Second)
		}
	}

	if err := json.NewEncoder(os.Stdout).Encode(res); err != nil {
		log.Fatal(err)
	}
}

type Catalogue struct {
	BrandName  string
	Season     string
	Snowboards map[string]CatalogueSnowboards
}

type CatalogueSnowboards struct {
	Riders string
	Urls   []string
}

type Snowboard struct {
	BrandName string   `json:"brandname"`
	Name      string   `json:"name"`
	Season    string   `json:"season"`
	Riders    string   `json:"riders"`
	Sizes     []string `json:"sizes"`
}
