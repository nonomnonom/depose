{{/*
Expand the name of the chart.
*/}}
{{- define "depose.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Create a default fully qualified app name.
*/}}
{{- define "depose.fullname" -}}
{{- if .Values.fullnameOverride }}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- $name := default .Chart.Name .Values.nameOverride }}
{{- if .Values.nameSuffix }}
{{- $name = join "-" [ $name .Values.nameSuffix ]}}
{{- end }}
{{- $name | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- end }}

{{/*
Create chart name and version as used by the chart label.
*/}}
{{- define "depose.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Common labels
*/}}
{{- define "depose.labels" -}}
helm.sh/chart: {{ include "depose.chart" . }}
{{ include "depose.selectorLabels" . }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end }}

{{/*
Selector labels
*/}}
{{- define "depose.selectorLabels" -}}
app.kubernetes.io/name: {{ include "depose.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}
