package main

import (
	"fmt"
	"github.com/PuerkitoBio/goquery"
	"io"
	"log"
	"net/http"
	"os"
	"path"
	"path/filepath"
	"regexp"
	"strings"
)

func libtech(url string, defaults Snowboard) (*Snowboard, error) {
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
		snowboard.BrandName = "Lib Tech"
	}

	if snowboard.Name == "" {
		snowboard.Name = doc.Find("h1.page-title span").Text()
	}

	if snowboard.Season == "" {
		snowboard.Season = fmt.Sprintf("W%s", strings.ReplaceAll(regexp.MustCompile(`\d{4}-\d{4}$`).FindString(doc.Find("title").Text()), "-", "_"))
	}

	snowboard.Sizes = []string{}

	doc.Find(".product.specification table tbody tr td:nth-child(1)").Each(func(i int, sel *goquery.Selection) {
		snowboard.Sizes = append(snowboard.Sizes, sel.Text())
	})

	attr, ok := doc.Find(".gallery-placeholder._block-content-loading img").First().Attr("src")
	if ok {
		_, err := downloadImageLibtech(attr, snowboard)
		if err != nil {
			return nil, err
		}
	}

	return &snowboard, nil
}

func downloadImageLibtech(url string, board Snowboard) (string, error) {
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

		println(path.Join(dirname, filename))

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
