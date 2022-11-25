package main

import (
	"encoding/json"
	"flag"
	"fmt"
	"github.com/pelletier/go-toml/v2"
	"io"
	"log"
	"net/http"
	"os"
	"path"
	"path/filepath"
	"time"
)

func main() {
	var (
		noImages = flag.Bool("no-images", false, "don't download images")
	)

	flag.Parse()

	var (
		res = make([]*Snowboard, 0)

		args = flag.Args()
	)

	for _, filename := range args {
		var (
			cat = new(Catalogue)
		)

		b, err := os.ReadFile(filename)
		if err != nil {
			log.Fatal(err)
		}

		if err := toml.Unmarshal(b, cat); err != nil {
			log.Fatal(err)
		}

		for _, list := range cat.Snowboards {
			for _, u := range list.Urls {
				defs := Snowboard{
					BrandName: cat.BrandName,
					Season:    cat.Season,
				}

				defs.Riders = list.Riders

				sn, err := gnu(u, defs, noImages)
				if err != nil {
					log.Fatal(err)
				}

				res = append(res, sn)

				time.Sleep(1 * time.Second)
			}
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
	BrandName string          `json:"brandname"`
	Name      string          `json:"name"`
	Season    string          `json:"season"`
	Riders    string          `json:"riders"`
	Sizes     []string        `json:"sizes"`
	Spec      map[string]Spec `json:"specs"`
}

type Spec struct {
	Length              float64  `json:"size"`
	Wide                bool     `json:"wide"`
	ContactLength       float64  `json:"contactLength,omitempty"`
	EffectiveEdgeLength float64  `json:"effectiveEdgeLength,omitempty"`
	BoardWeight         float64  `json:"boardWeight,omitempty"`
	BoardWeightLbs      float64  `json:"boardWeight_lbs,omitempty"`
	SurfaceArea         float64  `json:"surfaceArea,omitempty"`
	Sidecut             float64  `json:"sidecut,omitempty"`
	NoseWidth           float64  `json:"noseWidth,omitempty"`
	NoseLength          float64  `json:"noseLength,omitempty"`
	TailWidth           float64  `json:"tailWidth,omitempty"`
	TailLength          float64  `json:"tailLength,omitempty"`
	WaistWidth          float64  `json:"waistWidth,omitempty"`
	UnderfootWidthFront float64  `json:"underfootWidthFront,omitempty"`
	UnderfootWidthRear  float64  `json:"underfootWidthRear,omitempty"`
	StanceMin           float64  `json:"stanceMin,omitempty"`
	StanceMax           float64  `json:"stanceMax,omitempty"`
	StanceMinIn         float64  `json:"stanceMin_in,omitempty"`
	StanceMaxIn         float64  `json:"stanceMax_in,omitempty"`
	StanceSetBack       *float64 `json:"stanceSetBack,omitempty"`
	StanceSetBackIn     *float64 `json:"stanceSetBack_in,omitempty"`
	ReferenceStance     float64  `json:"referenceStance,omitempty"`
	ReferenceStanceIn   float64  `json:"referenceStance_in,omitempty"`
	CenteredStance      float64  `json:"centeredStance,omitempty"`
	CenteredStanceIn    float64  `json:"centeredStance_in,omitempty"`
	WeightMin           float64  `json:"weightMin,omitempty"`
	WeightMax           float64  `json:"weightMax,omitempty"`
	WeightMinLbs        float64  `json:"weightMin_lbs,omitempty"`
	WeightMaxLbs        float64  `json:"weightMax_lbs,omitempty"`
	Flex                float64  `json:"flex"`
}

func downloadImage(url string, board Snowboard) (string, error) {
	var (
		dirname = fmt.Sprintf("images/%s/%s/%s/", board.BrandName, board.Season, board.Name)

		filename = fmt.Sprintf(
			"%s_%s_%s%s",
			board.BrandName,
			board.Season, board.Name,
			filepath.Ext(url),
		)
	)

	resp, err := http.Get(url)
	if err != nil {
		return "", err
	}

	defer resp.Body.Close()

	if resp.StatusCode == http.StatusOK {
		if err := ensureDir(dirname); err != nil {
			return "", err
		}

		file, err := os.Create(path.Join(dirname, filename))

		defer file.Close()

		if err != nil {
			return "", err
		} else if _, err := io.Copy(file, resp.Body); err != nil {
			return "", err
		}
	}

	return filename, nil
}

func ensureDir(path string) error {
	err := os.MkdirAll(path, os.ModeDir|os.ModePerm)

	if os.IsExist(err) {
		return nil
	}

	return err
}

func newof[T any](val T) *T {
	return &val
}
