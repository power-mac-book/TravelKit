'use client';

import React, { useState, useEffect } from 'react';
import { 
  Card, CardContent, CardHeader, CardTitle,
  Tabs, TabsContent, TabsList, TabsTrigger,
  Button, Badge, Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
  Alert, AlertDescription, AlertTitle,
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
  Textarea, Label
} from '@/components/ui/card';
import { CalendarDays, Mail, MessageCircle, Send, TrendingUp, Users, Settings, AlertCircle } from 'lucide-react';

interface NotificationLog {
  id: number;
  template_name?: string;
  recipient_email?: string;
  recipient_phone?: string;
  notification_type: string;
  status: string;
  subject?: string;
  sent_at?: string;
  delivered_at?: string;
  error_message?: string;
  created_at: string;
}

interface NotificationStats {
  total_sent: number;
  email_sent: number;
  whatsapp_sent: number;
  delivered: number;
  failed: number;
  pending: number;
  delivery_rate: number;
  recent_activity: NotificationLog[];
}

interface NotificationTemplate {
  id: number;
  name: string;
  subject: string;
  is_active: boolean;
  template_variables: string[];
  created_at: string;
  updated_at?: string;
}

export default function NotificationManagementPage() {
  const [stats, setStats] = useState<NotificationStats | null>(null);
  const [logs, setLogs] = useState<NotificationLog[]>([]);
  const [templates, setTemplates] = useState<NotificationTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [templateFilter, setTemplateFilter] = useState<string>('');
  
  // Send notification form
  const [sendForm, setSendForm] = useState({
    template_name: '',
    recipient_email: '',
    recipient_phone: '',
    notification_type: 'both',
    template_data: '{}'
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [statsRes, logsRes, templatesRes] = await Promise.all([
        fetch('/api/v1/notifications/stats'),
        fetch('/api/v1/notifications/logs?limit=50'),
        fetch('/api/v1/notifications/templates')
      ]);

      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }

      if (logsRes.ok) {
        const logsData = await logsRes.json();
        setLogs(logsData);
      }

      if (templatesRes.ok) {
        const templatesData = await templatesRes.json();
        setTemplates(templatesData);
      }
    } catch (err) {
      setError('Failed to fetch notification data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      'sent': 'bg-blue-100 text-blue-800',
      'delivered': 'bg-green-100 text-green-800',
      'failed': 'bg-red-100 text-red-800',
      'pending': 'bg-yellow-100 text-yellow-800'
    };
    
    return (
      <Badge className={variants[status] || 'bg-gray-100 text-gray-800'}>
        {status}
      </Badge>
    );
  };

  const getNotificationTypeIcon = (type: string) => {
    switch (type) {
      case 'email': return <Mail className="h-4 w-4" />;
      case 'whatsapp': return <MessageCircle className="h-4 w-4" />;
      case 'both': return <div className="flex space-x-1"><Mail className="h-3 w-3" /><MessageCircle className="h-3 w-3" /></div>;
      default: return null;
    }
  };

  const handleSendNotification = async () => {
    try {
      const templateData = JSON.parse(sendForm.template_data);
      
      const response = await fetch('/api/v1/notifications/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...sendForm,
          template_data: templateData
        })
      });

      if (response.ok) {
        alert('Notification sent successfully!');
        fetchData(); // Refresh data
        setSendForm({
          template_name: '',
          recipient_email: '',
          recipient_phone: '',
          notification_type: 'both',
          template_data: '{}'
        });
      } else {
        alert('Failed to send notification');
      }
    } catch (err) {
      alert('Invalid JSON in template data');
    }
  };

  const triggerFollowUp = async () => {
    try {
      const response = await fetch('/api/v1/notifications/trigger/follow-up', {
        method: 'POST'
      });

      if (response.ok) {
        alert('Follow-up sequence triggered successfully!');
      } else {
        alert('Failed to trigger follow-up sequence');
      }
    } catch (err) {
      alert('Error triggering follow-up sequence');
    }
  };

  const filteredLogs = logs.filter(log => {
    if (statusFilter && log.status !== statusFilter) return false;
    if (typeFilter && log.notification_type !== typeFilter) return false;
    if (templateFilter && log.template_name !== templateFilter) return false;
    return true;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading notification data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert className="max-w-md mx-auto mt-8">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Notification Management</h1>
        <div className="flex space-x-2">
          <Button onClick={triggerFollowUp} variant="outline">
            <Send className="h-4 w-4 mr-2" />
            Trigger Follow-up
          </Button>
          <Button onClick={fetchData} variant="outline">
            Refresh Data
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Send className="h-8 w-8 text-blue-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Sent</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.total_sent.toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <TrendingUp className="h-8 w-8 text-green-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Delivery Rate</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.delivery_rate}%</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Mail className="h-8 w-8 text-purple-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Email Sent</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.email_sent.toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <MessageCircle className="h-8 w-8 text-orange-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">WhatsApp Sent</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.whatsapp_sent.toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="logs" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="logs">Notification Logs</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="send">Send Notification</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="logs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Notification Logs</CardTitle>
              <div className="flex space-x-4">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Statuses</SelectItem>
                    <SelectItem value="sent">Sent</SelectItem>
                    <SelectItem value="delivered">Delivered</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Filter by type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Types</SelectItem>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="whatsapp">WhatsApp</SelectItem>
                    <SelectItem value="both">Both</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={templateFilter} onValueChange={setTemplateFilter}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Filter by template" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Templates</SelectItem>
                    {templates.map(template => (
                      <SelectItem key={template.id} value={template.name}>
                        {template.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Template</TableHead>
                    <TableHead>Recipient</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Sent At</TableHead>
                    <TableHead>Subject</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="font-medium">
                        {log.template_name || 'N/A'}
                      </TableCell>
                      <TableCell>
                        {log.recipient_email || log.recipient_phone || 'N/A'}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          {getNotificationTypeIcon(log.notification_type)}
                          <span className="capitalize">{log.notification_type}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(log.status)}
                      </TableCell>
                      <TableCell>
                        {log.sent_at ? new Date(log.sent_at).toLocaleString() : 'Not sent'}
                      </TableCell>
                      <TableCell className="max-w-xs truncate">
                        {log.subject || 'N/A'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="templates" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Notification Templates</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Variables</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Updated</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {templates.map((template) => (
                    <TableRow key={template.id}>
                      <TableCell className="font-medium">{template.name}</TableCell>
                      <TableCell className="max-w-xs truncate">{template.subject}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {template.template_variables?.length || 0} variables
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={template.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                          {template.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {template.updated_at ? new Date(template.updated_at).toLocaleDateString() : 'N/A'}
                      </TableCell>
                      <TableCell>
                        <Button variant="outline" size="sm">
                          <Settings className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="send" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Send Test Notification</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="template">Template</Label>
                  <Select value={sendForm.template_name} onValueChange={(value) => setSendForm({...sendForm, template_name: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select template" />
                    </SelectTrigger>
                    <SelectContent>
                      {templates.filter(t => t.is_active).map(template => (
                        <SelectItem key={template.id} value={template.name}>
                          {template.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="type">Notification Type</Label>
                  <Select value={sendForm.notification_type} onValueChange={(value) => setSendForm({...sendForm, notification_type: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="email">Email Only</SelectItem>
                      <SelectItem value="whatsapp">WhatsApp Only</SelectItem>
                      <SelectItem value="both">Both</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="email">Recipient Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={sendForm.recipient_email}
                    onChange={(e) => setSendForm({...sendForm, recipient_email: e.target.value})}
                    placeholder="user@example.com"
                  />
                </div>

                <div>
                  <Label htmlFor="phone">Recipient Phone</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={sendForm.recipient_phone}
                    onChange={(e) => setSendForm({...sendForm, recipient_phone: e.target.value})}
                    placeholder="+1234567890"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="template-data">Template Data (JSON)</Label>
                <Textarea
                  id="template-data"
                  value={sendForm.template_data}
                  onChange={(e) => setSendForm({...sendForm, template_data: e.target.value})}
                  placeholder='{"user_name": "John", "destination_name": "Goa"}'
                  rows={4}
                />
              </div>

              <Button onClick={handleSendNotification} className="w-full">
                <Send className="h-4 w-4 mr-2" />
                Send Test Notification
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Notification Settings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Configuration Required</AlertTitle>
                  <AlertDescription>
                    To enable notifications, configure the following environment variables:
                    <ul className="list-disc list-inside mt-2 space-y-1">
                      <li><code>SENDGRID_API_KEY</code> - For email notifications</li>
                      <li><code>TWILIO_ACCOUNT_SID</code> - For WhatsApp notifications</li>
                      <li><code>TWILIO_AUTH_TOKEN</code> - For WhatsApp notifications</li>
                      <li><code>FROM_EMAIL</code> - Sender email address</li>
                    </ul>
                  </AlertDescription>
                </Alert>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}