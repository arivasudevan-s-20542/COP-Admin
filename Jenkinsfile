// ─────────────────────────────────────────────────────────────────────────────
// CI/CD — zcop-admin (Angular 21 / Node 22)
//
// Jenkins runs ON the VPS — deploy is a direct local cp + nginx reload.
//
// Jenkins Tools required (Manage Jenkins → Tools):
//   NodeJS: name = "Node22"  (Node.js 22)
//
// Jenkins Environment Variables (Manage Jenkins → System → Global properties):
//   VPS_ADMIN_WEB_DIR  — absolute path served by nginx, e.g. /var/www/zcop-admin
//
// GitHub webhook:
//   Payload URL: http://<VPS_IP>:8080/github-webhook/
//   Content type: application/json  |  Event: Push
// ─────────────────────────────────────────────────────────────────────────────

pipeline {
    agent any

    tools {
        nodejs 'Node22'
    }

    options {
        buildDiscarder(logRotator(numToKeepStr: '10'))
        timestamps()
        timeout(time: 20, unit: 'MINUTES')
        disableConcurrentBuilds()
    }

    environment {
        VPS_ADMIN_WEB_DIR = '/var/www/zcop-admin'
    }

    triggers {
        githubPush()
    }

    stages {

        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Enable corepack') {
            // Angular 21 ships with npm@11 via Node 22 — corepack ensures exact version
            steps {
                sh 'corepack enable'
            }
        }

        stage('Install') {
            steps {
                sh 'npm ci'
            }
        }

        stage('Build') {
            steps {
                sh 'npm run build -- --configuration production'
            }
        }

        stage('Deploy') {
            steps {
                sh '''
                    set -e
                    sudo mkdir -p "${VPS_ADMIN_WEB_DIR}"
                    sudo cp -r dist/. "${VPS_ADMIN_WEB_DIR}/"
                    sudo systemctl reload nginx || sudo nginx -s reload
                    echo "zcop-admin deployed to ${VPS_ADMIN_WEB_DIR} ✓"
                '''
            }
        }
    }

    post {
        success {
            echo "✅ zcop-admin build #${env.BUILD_NUMBER} deployed"
        }
        failure {
            echo "❌ zcop-admin build #${env.BUILD_NUMBER} failed"
        }
        always {
            cleanWs()
        }
    }
}
