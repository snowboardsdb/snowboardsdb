package main

import (
	"fmt"
	"github.com/PuerkitoBio/goquery"
	"log"
	"net/http"
	"regexp"
	"strconv"
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

	doc.Find(".product.specification table tbody tr td:nth-child(1)").Each(func(i int, sel *goquery.Selection) {
		snowboard.Sizes = append(snowboard.Sizes, sel.Text())
	})

	snowboard.Spec = gnuSpecs(doc)

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

func gnuSpecs(doc *goquery.Document) map[string]Spec {
	var (
		res = make(map[string]Spec)
	)

	doc.Find(".product.specification table tbody tr").Each(func(i int, sel *goquery.Selection) {
		var (
			size = sel.Find("td:nth-child(1)").Text()
		)

		if size == "" {
			return
		}

		var (
			spec = Spec{}
		)

		if val, err := strconv.ParseFloat(strings.ReplaceAll(size, "W", ""), 64); err == nil {
			spec.Length = val
		}

		spec.Wide = strings.Contains(size, "W")

		if val, err := strconv.ParseFloat(sel.Find("td:nth-child(2)").Text(), 64); err == nil {
			spec.ContactLength = val
		}

		if val, err := strconv.ParseFloat(sel.Find("td:nth-child(3)").Text(), 64); err == nil {
			spec.Sidecut = val
		}

		if nose, tail, ok := strings.Cut(sel.Find("td:nth-child(4)").Text(), " / "); ok {
			if val, err := strconv.ParseFloat(nose, 64); err == nil {
				spec.NoseWidth = val
			}

			if val, err := strconv.ParseFloat(tail, 64); err == nil {
				spec.TailWidth = val
			}
		}

		if waist, err := strconv.ParseFloat(sel.Find("td:nth-child(5)").Text(), 64); err == nil {
			spec.WaistWidth = waist
		}

		if minMax, setBack, ok := strings.Cut(sel.Find("td:nth-child(6)").Text(), " / "); ok {
			if min, max, ok := strings.Cut(minMax, "-"); ok {
				if val, err := strconv.ParseFloat(strings.ReplaceAll(min, `"`, ""), 64); err == nil {
					spec.StanceMinIn = val
				}

				if val, err := strconv.ParseFloat(strings.ReplaceAll(max, `"`, ""), 64); err == nil {
					spec.StanceMaxIn = val
				}
			}

			if val, err := strconv.ParseFloat(strings.ReplaceAll(setBack, `"`, ""), 64); err == nil {
				spec.StanceSetBackIn = newof(val)
			}
		}

		if minMax, setBack, ok := strings.Cut(sel.Find("td:nth-child(7)").Text(), " / "); ok {
			if min, max, ok := strings.Cut(minMax, " - "); ok {
				if val, err := strconv.ParseFloat(strings.ReplaceAll(min, ",", "."), 64); err == nil {
					spec.StanceMin = val
				}

				if val, err := strconv.ParseFloat(strings.ReplaceAll(max, ",", "."), 64); err == nil {
					spec.StanceMax = val
				}
			}

			if val, err := strconv.ParseFloat(
				strings.ReplaceAll(strings.ReplaceAll(setBack, ` cm`, ""), ",", "."),
				64,
			); err == nil {
				spec.StanceSetBack = newof(val)
			}
		}

		if val, err := strconv.ParseFloat(sel.Find("td:nth-child(8)").Text(), 64); err == nil {
			spec.Flex = val
		}

		if weightMin, weightMax, ok := strings.Cut(sel.Find("td:nth-child(9)").Text(), "-"); ok {
			if val, err := strconv.ParseFloat(weightMin, 64); err == nil {
				spec.WeightMinLbs = val
			}

			if val, err := strconv.ParseFloat(weightMax, 64); err == nil {
				spec.WeightMaxLbs = val
			}
		}

		if val, err := strconv.ParseFloat(
			regexp.MustCompile(`[^\d]`).ReplaceAllString(sel.Find("td:nth-child(10)").Text(), ""),
			64,
		); err == nil {
			spec.WeightMin = val
		}

		res[size] = spec
	})

	return res
}
