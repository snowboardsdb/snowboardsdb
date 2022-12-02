package main

import (
	"github.com/PuerkitoBio/goquery"
	"os"
	"reflect"
	"testing"
)

func Test_mervinSpecs(t *testing.T) {
	var (
		antigravity *goquery.Document

		err error
	)

	antigravity, err = getDoc("./test/antigravity.html")
	if err != nil {
		t.Fatalf("can't read html: %s", err)
	}

	type args struct {
		doc *goquery.Document
	}

	tests := []struct {
		name string
		args args
		want map[string]Spec
	}{
		{
			name: "Antigravity",
			args: args{
				doc: antigravity,
			},
			want: map[string]Spec{
				"150": {
					Length:          150,
					Wide:            false,
					ContactLength:   106,
					Sidecut:         8,
					NoseWidth:       28.8,
					TailWidth:       28.5,
					WaistWidth:      25,
					StanceMin:       47,
					StanceMax:       59,
					StanceSetBack:   newof(2.5),
					StanceMinIn:     18.5,
					StanceMaxIn:     23.25,
					StanceSetBackIn: newof(1.0),
					Flex:            5,
					WeightMin:       40,
					WeightMinLbs:    100,
					WeightMaxLbs:    200,
				},
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := mervinSpecs(tt.args.doc); !reflect.DeepEqual(got["150"], tt.want["150"]) {
				t.Errorf("mervinSpecs() = %v, want %v", got["150"], tt.want["150"])
			}
		})
	}
}

func getDoc(filename string) (*goquery.Document, error) {
	file, err := os.Open(filename)
	if err != nil {
		return nil, err
	}

	doc, err := goquery.NewDocumentFromReader(file)
	if err != nil {
		return nil, err
	}

	return doc, nil
}
