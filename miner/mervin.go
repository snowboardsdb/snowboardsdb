package main

import (
	"github.com/PuerkitoBio/goquery"
	"regexp"
	"strconv"
	"strings"
)

func mervinSpecs(doc *goquery.Document) map[string]Spec {
	var (
		res = make(map[string]Spec)
	)

	doc.Find(".product.specification table tbody tr").Each(func(i int, sel *goquery.Selection) {
		var (
			size = regexp.MustCompile(`^[0-9\.]+W?`).FindString(sel.Find("td:nth-child(1)").Text())
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

		if m := regexp.MustCompile(`\(([0-9\.]+)\ssq\sin\)`).FindStringSubmatch(
			sel.Find("td:nth-child(1)").Text(),
		); len(m) > 1 {
			if val, err := strconv.ParseFloat(m[1], 64); err == nil {
				spec.SurfaceAreaIn = val
			}
		}

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
