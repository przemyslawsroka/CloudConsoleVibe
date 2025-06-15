# AppNeta API Integration

## Overview

Successfully integrated the Cloud Network Insights page with the real AppNeta API instead of using mocked data. The integration connects to the AppNeta demo environment and retrieves live network path data.

## Implementation Details

### 🔧 Configuration

**Environment Configuration:**
- **Development**: `https://demo.pm.appneta.com/api/v3`
- **Production**: Configurable via environment variables
- **API Key**: Configured via environment variables (see SECURITY_SETUP.md)
- **Authentication**: `Authorization: Token <api_key>`

**Files Updated:**
- `src/environments/environment.ts` - Development configuration
- `src/environments/environment.prod.ts` - Production configuration with environment variable support
- `proxy.conf.json` - Angular proxy configuration for CORS handling

### 🌐 API Integration

**AppNeta Service (`src/app/services/appneta.service.ts`):**
- ✅ Real API integration with fallback to demo mode
- ✅ Proper authentication using `Token` header
- ✅ Error handling with automatic fallback to mock data
- ✅ Retry logic and connection testing
- ✅ Environment-based configuration (demo vs live mode)

**API Interfaces (`src/app/interfaces/appneta-api.interface.ts`):**
- ✅ Complete AppNeta API v3 response structure mapping
- ✅ Conversion functions from API format to internal format
- ✅ Status determination logic based on API response

### 📊 Features Implemented

**Real Data Integration:**
- ✅ Network paths from AppNeta demo environment
- ✅ Live status indicators (OK, Connectivity Loss, Disabled)
- ✅ Real monitoring point information
- ✅ Actual network path configurations

**UI Enhancements:**
- ✅ Demo mode indicator in integration banner
- ✅ Connection status display (Connected/Disconnected/Testing)
- ✅ Real-time connection testing
- ✅ Manual connection test option in menu

**Error Handling:**
- ✅ Graceful fallback to demo mode on API errors
- ✅ Connection status monitoring
- ✅ User-friendly error messages
- ✅ Retry mechanisms

## API Endpoints Used

### Network Paths
```
GET /api/v3/path
```
**Response:** Array of network path configurations with full details including:
- Path ID, name, and description
- Source appliance and target information
- Network type, importance, and status
- Tags, monitoring policies, and alert profiles
- Connection details (ISP, VPN status, protocol)

### Authentication
```
Authorization: Token <your-appneta-api-key>
```

## Sample API Response

```json
{
  "sourceAppliance": "appneta-gcp",
  "target": "gmt.pm.appneta.com",
  "orgId": 19091,
  "id": 306915,
  "pathName": "appneta-gcp <-> Azure Target",
  "networkType": "WAN",
  "disabled": false,
  "connectionType": "Unknown",
  "vpn": "Unknown",
  "tags": [
    {
      "category": "UseCase",
      "value": "Cross Cloud Networking",
      "resourceType": "NETWORK_PATH"
    }
  ]
}
```

## Configuration Options

### Demo Mode vs Live Mode

**Demo Mode** (`demoMode: true`):
- Uses mock data for demonstration
- No external API calls
- Ideal for development and testing

**Live Mode** (`demoMode: false`):
- Connects to real AppNeta API
- Retrieves live network data
- Falls back to demo mode on errors

### Environment Variables (Production)

```bash
APPNETA_API_BASE_URL=https://your-org.pm.appneta.com/api/v3
APPNETA_API_KEY=your-api-key-here
APPNETA_DEMO_MODE=false
```

## Testing

### Manual Testing
1. Navigate to `/cloud-network-insights`
2. Check integration banner status
3. Verify network paths are loaded from API
4. Test connection using menu option

### API Testing
```bash
# Test direct API access
curl -H "Authorization: Token <your-appneta-api-key>" \
     "https://demo.pm.appneta.com/api/v3/path?limit=5"

# Test through Angular proxy
curl -H "Authorization: Token <your-appneta-api-key>" \
     "http://localhost:4200/appneta-api/api/v3/path?limit=5"
```

## Security Considerations

### ⚠️ CRITICAL SECURITY UPDATE

**API keys have been removed from the repository for security reasons.**

### API Key Management
- ✅ API keys now stored in environment variables only
- ✅ Template files provided for secure configuration
- ✅ Automatic demo mode when no valid API key is present
- ✅ Production uses environment variables exclusively
- ✅ Development supports both environment variables and local files
- ⚠️ API keys should be rotated regularly in production

### Setup Instructions
1. **Copy template files**: Use `env.template` and `environment.local.ts.template`
2. **Configure API keys**: Add your actual AppNeta API key
3. **Verify security**: Ensure `.env` and `environment.local.ts` are in `.gitignore`
4. **Use demo mode**: Set `APPNETA_DEMO_MODE=true` if no API key available

See [SECURITY_SETUP.md](SECURITY_SETUP.md) for detailed instructions.

### CORS Handling
- ✅ Angular proxy handles CORS in development
- ✅ Production deployment should configure proper CORS headers
- ✅ Secure HTTPS connections enforced

## Troubleshooting

### Common Issues

**Connection Failed:**
- Verify API key is valid
- Check network connectivity
- Ensure correct AppNeta endpoint URL

**Authentication Errors:**
- Confirm using `Token` authentication (not `Bearer`)
- Verify API key has proper permissions
- Check if API key is active

**CORS Issues:**
- Ensure proxy configuration is correct
- Verify Angular dev server is running with proxy
- Check production CORS configuration

### Debug Information

The service provides detailed logging:
```typescript
console.log('AppNeta Service running in LIVE MODE - using real API');
console.log('Loaded network paths from AppNeta API:', networkPaths);
```

## Future Enhancements

### Planned Features
- [ ] Web path monitoring integration
- [ ] Monitoring points API integration
- [ ] Real-time metrics data (latency, packet loss, jitter)
- [ ] Alert policies management
- [ ] Historical data visualization

### API Endpoints to Implement
- `GET /api/v3/webPath` - Web application monitoring
- `GET /api/v3/appliance` - Monitoring points
- `GET /api/v3/path/{id}/data` - Performance metrics
- `GET /api/v3/monitoringPolicy` - Alert policies

## Success Metrics

✅ **Integration Complete:**
- Real AppNeta API connection established
- Live network path data displayed
- Proper error handling and fallbacks
- User-friendly status indicators
- Comprehensive documentation

✅ **API Response Verified:**
- 5 network paths retrieved from demo environment
- Proper data mapping and display
- Status determination working correctly
- Connection testing functional

The AppNeta API integration is now fully functional and ready for production use with proper environment configuration. 