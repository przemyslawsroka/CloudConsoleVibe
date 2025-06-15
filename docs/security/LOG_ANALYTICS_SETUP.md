# Log Analytics Setup for VPC Flow Logs Analysis

## Overview

This application now uses Google Cloud Log Analytics API to query VPC Flow Logs data instead of mocked data. Log Analytics provides powerful SQL-based querying capabilities for analyzing log data at scale.

## Prerequisites

1. **VPC Flow Logs enabled** on your VPC networks
2. **Log Analytics upgraded bucket** to store and analyze logs
3. **Proper IAM permissions** to access logs and Log Analytics

## Setup Instructions

### 1. Enable VPC Flow Logs

For each VPC network you want to analyze:

```bash
# Enable VPC Flow Logs for a subnet
gcloud compute networks subnets update SUBNET_NAME \
    --region=REGION \
    --enable-flow-logs \
    --logging-aggregation-interval=INTERVAL_5_SEC \
    --logging-flow-sampling=0.5 \
    --logging-metadata=INCLUDE_ALL_METADATA
```

Or via the Google Cloud Console:
- Go to **VPC network > VPC networks**
- Select your network > **Subnets**
- Edit the subnet and enable **Flow logs**

### 2. Upgrade Log Bucket for Log Analytics

#### Option A: Using Google Cloud Console
1. Go to **Logging > Log Analytics**
2. Select your project and location (usually `global`)
3. Find the `_Default` bucket and click **Upgrade**
4. Follow the upgrade wizard

#### Option B: Using gcloud CLI
```bash
# Upgrade the default log bucket
gcloud logging buckets update _Default \
    --location=global \
    --enable-analytics
```

### 3. Configure IAM Permissions

Grant one of these roles to your user account:

```bash
# For full log access
gcloud projects add-iam-policy-binding PROJECT_ID \
    --member="user:your-email@domain.com" \
    --role="roles/logging.viewer"

# Or for specific log view access
gcloud projects add-iam-policy-binding PROJECT_ID \
    --member="user:your-email@domain.com" \
    --role="roles/logging.viewAccessor"
```

### 4. Verify Setup

1. **Check if logs are flowing**: 
   - Go to **Logging > Logs Explorer**
   - Filter by: `logName:"compute.googleapis.com/vpc_flows"`
   - You should see VPC Flow Logs appearing

2. **Test Log Analytics**:
   - Go to **Logging > Log Analytics**
   - Try running a simple query:
   ```sql
   SELECT *
   FROM `PROJECT_ID.global._Default._AllLogs`
   WHERE logName LIKE "%vpc_flows%"
   LIMIT 10
   ```

## Application Configuration

The application automatically detects and uses Log Analytics with these defaults:

- **Location**: `global`
- **Bucket**: `_Default`
- **Log View**: `_AllLogs`

You can override these settings by passing parameters to the `queryFlowLogs` method:

```typescript
this.flowAnalyzerService.queryFlowLogs(
  projectId,
  filters,
  metricType,
  aggregationPeriod,
  customQuery,
  'custom-bucket',  // Optional: custom bucket name
  'us-central1'     // Optional: custom location
);
```

## Fallback Behavior

The application implements a graceful fallback system:

1. **First**: Attempts to use Log Analytics API
2. **Second**: Falls back to standard Cloud Logging API
3. **Last**: Uses mock data for development/testing

## Troubleshooting

### Common Issues

1. **403 Forbidden Error**
   - **Solution**: Check IAM permissions (see step 3 above)

2. **404 Not Found Error**
   - **Solution**: Upgrade your log bucket for Log Analytics (see step 2 above)

3. **No data returned**
   - **Solution**: Ensure VPC Flow Logs are enabled and flowing (see step 1 above)
   - **Wait time**: It may take 5-10 minutes for logs to start appearing

4. **Query timeout or performance issues**
   - **Solution**: Reduce the time range or add more specific filters
   - **Tip**: Use smaller aggregation periods for shorter time ranges

### Checking Application Status

The application provides a helper method to check Log Analytics availability:

```typescript
const status = await this.flowAnalyzerService.checkLogAnalyticsAvailability('your-project-id');
console.log(status.message);
if (!status.available && status.setupInstructions) {
  console.log('Setup instructions:', status.setupInstructions);
}
```

## Example Queries

### Basic VPC Flow Analysis
```sql
SELECT
  DATETIME_TRUNC(DATETIME(timestamp), MINUTE) as time_window,
  jsonPayload.src_ip as source_ip,
  jsonPayload.dest_ip as destination_ip,
  SUM(CAST(jsonPayload.bytes_sent as INT64)) as total_bytes
FROM `PROJECT_ID.global._Default._AllLogs`
WHERE
  timestamp >= TIMESTAMP("2024-01-01T00:00:00Z") 
  AND timestamp <= TIMESTAMP("2024-01-01T23:59:59Z")
  AND logName LIKE "projects/PROJECT_ID/logs/compute.googleapis.com%vpc_flows"
  AND jsonPayload.reporter = "SRC"
GROUP BY time_window, source_ip, destination_ip
ORDER BY total_bytes DESC
LIMIT 100
```

### Top Talkers Analysis
```sql
SELECT
  jsonPayload.src_ip as source_ip,
  COUNT(*) as connection_count,
  SUM(CAST(jsonPayload.bytes_sent as INT64)) as total_bytes_sent,
  AVG(CAST(jsonPayload.rtt_msec as FLOAT64)) as avg_latency_ms
FROM `PROJECT_ID.global._Default._AllLogs`
WHERE
  timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 1 HOUR)
  AND logName LIKE "projects/PROJECT_ID/logs/compute.googleapis.com%vpc_flows"
  AND jsonPayload.reporter = "SRC"
GROUP BY source_ip
ORDER BY total_bytes_sent DESC
LIMIT 20
```

## Cost Considerations

- Log Analytics queries are billed based on data processed
- Use time-based filters to reduce query scope
- Consider log retention policies for cost optimization
- Monitor usage in the **Billing** section of Google Cloud Console

## Support

For additional help:
- [Google Cloud Log Analytics Documentation](https://cloud.google.com/logging/docs/log-analytics)
- [VPC Flow Logs Documentation](https://cloud.google.com/vpc/docs/flow-logs)
- [Google Cloud Support](https://cloud.google.com/support) 