package main

import (
	"fmt"
	"github.com/PuerkitoBio/goquery"
	"log"
	"net/http"
	"regexp"
	"strings"
)

func gnu(url string, defaults Snowboard, noImages *bool) (*Snowboard, error) {
	var (
		snowboard = defaults
	)

	resp, err := http.Get(url)
	if err != nil {
		return nil, err
	}

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("response status %d: %s", resp.StatusCode, resp.Status)
	}

	defer resp.Body.Close()

	doc, err := goquery.NewDocumentFromReader(resp.Body)
	if err != nil {
		log.Fatal(err)
	}

	if snowboard.BrandName == "" {
		snowboard.BrandName = "Gnu"
	}

	if snowboard.Name == "" {
		snowboard.Name = doc.Find("h1.page-title span").Text()
	}

	if snowboard.Season == "" {
		snowboard.Season = fmt.Sprintf("W%s", strings.ReplaceAll(regexp.MustCompile(`\d{4}-\d{4}$`).FindString(doc.Find("title").Text()), "-", "_"))
	}

	snowboard.Sizes = []string{}

	snowboard.Spec = mervinSpecs(doc)

	for sz, _ := range snowboard.Spec {
		snowboard.Sizes = append(snowboard.Sizes, sz)
	}

	if noImages == nil || !*noImages {
		attr, ok := doc.Find(".gallery-placeholder._block-content-loading img").First().Attr("src")
		if ok {
			_, err := downloadImage(attr, snowboard)
			if err != nil {
				return nil, err
			}
		}
	}

	return &snowboard, nil
}
