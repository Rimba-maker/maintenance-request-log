// CI pipeline. Every stage is explained in README.md ("Jenkinsfile").
pipeline {
  agent none

  options {
    timestamps()
    timeout(time: 20, unit: 'MINUTES')
    disableConcurrentBuilds()
  }

  stages {
    // The API and web checks are independent, so they run in parallel.
    stage('Verify') {
      parallel {
        stage('API') {
          agent { docker { image 'node:24-slim'; args '-e HOME=/tmp' } }
          stages {
            stage('API: install')   { steps { dir('apps/api') { sh 'npm ci' } } }
            stage('API: typecheck') { steps { dir('apps/api') { sh 'npm run typecheck' } } }
            stage('API: test')      { steps { dir('apps/api') { sh 'npm test' } } }
            stage('API: build')     { steps { dir('apps/api') { sh 'npm run build' } } }
          }
        }
        stage('Web') {
          agent { docker { image 'node:24-slim'; args '-e HOME=/tmp' } }
          stages {
            stage('Web: install') { steps { dir('apps/web') { sh 'npm ci' } } }
            stage('Web: build')   { steps { dir('apps/web') { sh 'npm run build' } } } // typecheck + production build
          }
        }
      }
    }

    // Proves the deliverable itself works: a clean `docker compose up` that becomes healthy and serves the API.
    stage('Compose smoke test') {
      agent any
      environment { WEB_PORT = '18080' } // avoid clashing with anything else on the CI host
      steps {
        sh 'cp .env.example .env'
        sh 'docker compose up -d --build --wait'
        sh 'curl --fail --silent http://localhost:${WEB_PORT}/api/health'
      }
      post {
        always { sh 'docker compose down -v --remove-orphans' }
      }
    }
  }
}
