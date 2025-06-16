import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, BehaviorSubject, throwError, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { AuthService } from './auth.service';
import { ProjectService } from './project.service';

export interface UrlList {
  name: string;
  displayName?: string;
  description?: string;
  region: string;
  values: string[];
  createTime?: string;
  updateTime?: string;
  numberOfEntries?: number;
  lastUpdated?: string;
}

export interface UrlListRequest {
  name: string;
  description?: string;
  values: string[];
}

@Injectable({
  providedIn: 'root'
})
export class UrlListsService {
  private urlListsSubject = new BehaviorSubject<UrlList[]>([]);
  public urlLists$ = this.urlListsSubject.asObservable();

  private baseUrl = 'https://networksecurity.googleapis.com/v1';

  constructor(
    private http: HttpClient,
    private authService: AuthService,
    private projectService: ProjectService
  ) {}

  private getHeaders(): HttpHeaders {
    const token = this.authService.getAccessToken();
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
  }

  private getCurrentProject(): string {
    const project = this.projectService.getCurrentProject();
    return project?.id || 'demo-project';
  }

  getUrlLists(location: string = 'us-central1'): Observable<UrlList[]> {
    if (this.authService.isDemoMode()) {
      return this.getMockUrlLists();
    }

    const projectId = this.getCurrentProject();
    const url = `${this.baseUrl}/projects/${projectId}/locations/${location}/urlLists`;

    return this.http.get<any>(url, { headers: this.getHeaders() }).pipe(
      map(response => {
        const urlLists = (response.urlLists || []).map((urlList: any) => this.mapGcpUrlList(urlList, location));
        this.urlListsSubject.next(urlLists);
        return urlLists;
      }),
      catchError(error => {
        console.error('Error loading URL lists:', error);
        return this.getMockUrlLists();
      })
    );
  }

  createUrlList(location: string, urlListData: UrlListRequest): Observable<UrlList> {
    if (this.authService.isDemoMode()) {
      return this.createMockUrlList(urlListData, location);
    }

    const projectId = this.getCurrentProject();
    const url = `${this.baseUrl}/projects/${projectId}/locations/${location}/urlLists`;

    const requestBody = {
      urlListId: urlListData.name,
      urlList: {
        description: urlListData.description,
        values: urlListData.values
      }
    };

    return this.http.post<any>(url, requestBody, { headers: this.getHeaders() }).pipe(
      map(response => this.mapGcpUrlList(response, location)),
      catchError(error => {
        console.error('Error creating URL list:', error);
        throw error;
      })
    );
  }

  updateUrlList(location: string, name: string, urlListData: UrlListRequest): Observable<UrlList> {
    if (this.authService.isDemoMode()) {
      return this.updateMockUrlList(name, urlListData, location);
    }

    const projectId = this.getCurrentProject();
    const url = `${this.baseUrl}/projects/${projectId}/locations/${location}/urlLists/${name}`;

    const requestBody = {
      description: urlListData.description,
      values: urlListData.values
    };

    return this.http.patch<any>(url, requestBody, { headers: this.getHeaders() }).pipe(
      map(response => this.mapGcpUrlList(response, location)),
      catchError(error => {
        console.error('Error updating URL list:', error);
        throw error;
      })
    );
  }

  deleteUrlList(location: string, name: string): Observable<any> {
    if (this.authService.isDemoMode()) {
      return this.deleteMockUrlList(name);
    }

    const projectId = this.getCurrentProject();
    const url = `${this.baseUrl}/projects/${projectId}/locations/${location}/urlLists/${name}`;

    return this.http.delete(url, { headers: this.getHeaders() }).pipe(
      catchError(error => {
        console.error('Error deleting URL list:', error);
        throw error;
      })
    );
  }

  private mapGcpUrlList(gcpUrlList: any, location: string): UrlList {
    const name = gcpUrlList.name ? gcpUrlList.name.split('/').pop() : 'unknown';
    const numberOfEntries = gcpUrlList.values ? gcpUrlList.values.length : 0;
    
    return {
      name: name,
      displayName: gcpUrlList.displayName || name,
      description: gcpUrlList.description || '',
      region: location,
      values: gcpUrlList.values || [],
      createTime: gcpUrlList.createTime,
      updateTime: gcpUrlList.updateTime,
      numberOfEntries: numberOfEntries,
      lastUpdated: gcpUrlList.updateTime || gcpUrlList.createTime
    };
  }

  private getMockUrlLists(): Observable<UrlList[]> {
    const mockUrlLists: UrlList[] = [
      {
        name: 'abde',
        region: 'northamerica-northeast1',
        values: ['example.com'],
        numberOfEntries: 1,
        lastUpdated: 'Jul 5, 2023, 10:59:01 AM',
        createTime: '2023-07-05T10:59:01Z',
        updateTime: '2023-07-05T10:59:01Z'
      },
      {
        name: 'dwdw',
        region: 'northamerica-northeast1',
        values: ['test.com'],
        numberOfEntries: 1,
        lastUpdated: 'Oct 22, 2023, 7:12:42 PM',
        createTime: '2023-10-22T19:12:42Z',
        updateTime: '2023-10-22T19:12:42Z'
      },
      {
        name: 'foo-bar',
        region: 'us-central1',
        values: ['foo.com', 'bar.com', 'example.org', 'test.net'],
        numberOfEntries: 4,
        lastUpdated: 'Jun 10, 2025, 2:47:45 PM',
        createTime: '2025-06-10T14:47:45Z',
        updateTime: '2025-06-10T14:47:45Z'
      },
      {
        name: 'know-urls',
        region: 'europe-central2',
        values: ['google.com', 'github.com'],
        numberOfEntries: 2,
        lastUpdated: 'Apr 27, 2023, 3:32:30 PM',
        createTime: '2023-04-27T15:32:30Z',
        updateTime: '2023-04-27T15:32:30Z'
      },
      {
        name: 'netczuk-lol',
        region: 'us-central1',
        values: Array.from({ length: 2500 }, (_, i) => `url-${i}.com`),
        numberOfEntries: 2500,
        lastUpdated: 'Apr 27, 2023, 2:45:08 PM',
        createTime: '2023-04-27T14:45:08Z',
        updateTime: '2023-04-27T14:45:08Z'
      },
      {
        name: 'new-url-list-delete-me-2',
        region: 'southamerica-west1',
        values: ['delete-me.com'],
        numberOfEntries: 1,
        lastUpdated: 'Sep 9, 2024, 2:27:40 PM',
        createTime: '2024-09-09T14:27:40Z',
        updateTime: '2024-09-09T14:27:40Z'
      },
      {
        name: 'shrey-test',
        region: 'southamerica-east1',
        values: ['shrey.com'],
        numberOfEntries: 1,
        lastUpdated: 'May 29, 2024, 3:07:10 PM',
        createTime: '2024-05-29T15:07:10Z',
        updateTime: '2024-05-29T15:07:10Z'
      },
      {
        name: 'test-url',
        region: 'us-central1',
        values: ['test-url.com'],
        numberOfEntries: 1,
        lastUpdated: 'May 30, 2023, 7:31:11 AM',
        createTime: '2023-05-30T07:31:11Z',
        updateTime: '2023-05-30T07:31:11Z'
      },
      {
        name: 'test-url-list-1',
        region: 'us-central1',
        values: Array.from({ length: 6 }, (_, i) => `list1-url-${i}.com`),
        numberOfEntries: 6,
        lastUpdated: 'Apr 28, 2023, 11:27:29 AM',
        createTime: '2023-04-28T11:27:29Z',
        updateTime: '2023-04-28T11:27:29Z'
      },
      {
        name: 'test-url-list-2',
        region: 'us-central1',
        values: ['list2-url.com'],
        numberOfEntries: 1,
        lastUpdated: 'Apr 18, 2023, 12:28:25 PM',
        createTime: '2023-04-18T12:28:25Z',
        updateTime: '2023-04-18T12:28:25Z'
      },
      {
        name: 'test-url-list-3',
        region: 'us-central1',
        values: ['list3-url1.com', 'list3-url2.com'],
        numberOfEntries: 2,
        lastUpdated: 'Apr 18, 2023, 12:28:15 PM',
        createTime: '2023-04-18T12:28:15Z',
        updateTime: '2023-04-18T12:28:15Z'
      },
      {
        name: 'test-url-list-dani-b',
        region: 'europe-southwest1',
        values: ['dani-b1.com', 'dani-b2.com'],
        numberOfEntries: 2,
        lastUpdated: 'Jul 5, 2023, 10:47:37 AM',
        createTime: '2023-07-05T10:47:37Z',
        updateTime: '2023-07-05T10:47:37Z'
      },
      {
        name: 'urllist-3123',
        region: 'northamerica-northeast1',
        values: ['urllist-3123.com'],
        numberOfEntries: 1,
        lastUpdated: 'May 15, 2023, 11:54:44 AM',
        createTime: '2023-05-15T11:54:44Z',
        updateTime: '2023-05-15T11:54:44Z'
      }
    ];

    return of(mockUrlLists);
  }

  private createMockUrlList(urlListData: UrlListRequest, location: string): Observable<UrlList> {
    const mockUrlList: UrlList = {
      name: urlListData.name,
      description: urlListData.description,
      region: location,
      values: urlListData.values,
      numberOfEntries: urlListData.values.length,
      lastUpdated: new Date().toLocaleDateString(),
      createTime: new Date().toISOString(),
      updateTime: new Date().toISOString()
    };

    // Simulate async operation
    return of(mockUrlList);
  }

  private updateMockUrlList(name: string, urlListData: UrlListRequest, location: string): Observable<UrlList> {
    const mockUrlList: UrlList = {
      name: urlListData.name,
      description: urlListData.description,
      region: location,
      values: urlListData.values,
      numberOfEntries: urlListData.values.length,
      lastUpdated: new Date().toLocaleString(),
      createTime: new Date().toISOString(),
      updateTime: new Date().toISOString()
    };
    return of(mockUrlList);
  }

  private deleteMockUrlList(name: string): Observable<any> {
    // Simulate async operation
    return of({ success: true });
  }
} 