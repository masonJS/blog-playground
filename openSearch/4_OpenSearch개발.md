## OpenSearch 개발


### docker-compose yml 세팅
1. [Set up a cluster without security (for local development)](https://docs.opensearch.org/latest/getting-started/quickstart/#set-up-a-cluster-without-security-for-local-development)
2. [Sample Docker Compose file for development](https://docs.opensearch.org/latest/install-and-configure/install-opensearch/docker/#sample-docker-compose-file-for-development)에 있는 yml 파일 사용
3. plugin 세팅
```
-- Dockerfile.opensearch 파일

#
FROM opensearchproject/opensearch:latest
# 플러그인 설치
RUN /usr/share/opensearch/bin/opensearch-plugin install analysis-nori


-- docker-compose.yml 파일

/*  */
  opensearch-node1:
    build:
      context: ./docker
      dockerfile: Dockerfile.opensearch
    container_name: opensearch-node1
/*  */

```
