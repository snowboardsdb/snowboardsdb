aws --profile snowboardsdb \
  --endpoint-url https://storage.yandexcloud.net \                                                                                                                                          --region ru-central1 \
  s3 sync images/ s3://snowboardsdb/images/
