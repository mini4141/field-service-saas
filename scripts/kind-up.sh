#!/usr/bin/env bash
# Phase 1 K8s proof: kind cluster + Traefik (official chart) + the field-service Helm chart with in-cluster deps.
set -euo pipefail
source "$(dirname "$0")/lib.sh"
cd "$ROOT"
export KUBECONFIG="$LOCAL/kubeconfig-kind"
OUT="$ROOT/proof/phase1-local/logs"
mkdir -p "$OUT"

kind get clusters | grep -qx fss || kind create cluster --name fss --kubeconfig "$KUBECONFIG"
for t in api worker web; do kind load docker-image "fss-$t:dev" --name fss; done

helm repo add traefik https://traefik.github.io/charts >/dev/null 2>&1 || true
helm repo update traefik >/dev/null
helm upgrade --install traefik traefik/traefik --version 43.0.0 -n traefik --create-namespace \
  -f deploy/helm/traefik-values.yaml --set service.spec.type=ClusterIP --set-json service.annotations={} --wait --timeout 5m

helm upgrade --install fss deploy/helm/field-service --set images.tag=dev --wait --timeout 8m
kubectl rollout status deploy/api deploy/worker deploy/web --timeout=300s
kubectl wait --for=condition=complete job --all --timeout=300s

# prove it serves traffic through Traefik
kubectl -n traefik port-forward svc/traefik 18080:80 >"$LOCAL/logs/kind-pf.log" 2>&1 &
PF=$!
trap 'kill $PF 2>/dev/null || true' EXIT
wait_http http://localhost:18080/healthz 30
{
  echo "# kubectl get all (kind cluster 'fss')"
  kubectl get nodes
  echo; kubectl get all,ingress
  echo; kubectl -n traefik get pods
  echo; echo "# GET /healthz via Traefik"; curl -s http://localhost:18080/healthz; echo
  echo "# GET /login via Traefik (web)"; curl -s -o /dev/null -w "%{http_code}\n" http://localhost:18080/login
  echo "# POST /api/v1/auth/login via Traefik (seeded owner)"
  curl -s -X POST http://localhost:18080/api/v1/auth/login -H 'content-type: application/json' \
    -d '{"email":"owner@sakura.test","password":"password123"}' | cut -c1-120; echo
} | tee "$OUT/kind-get-all.txt"
