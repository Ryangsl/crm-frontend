import { apiDelete, apiGet, apiPatch, apiPost } from '@/services/api';
import type { Contact, ContactInput, Customer, CustomerInput, CustomerListResponse } from '../types/customer';

export interface ListCustomersParams {
  page?: number;
  limit?: number;
  q?: string;
}

export function listCustomers(params: ListCustomersParams = {}): Promise<CustomerListResponse> {
  const query = new URLSearchParams();
  if (params.page) query.set('page', String(params.page));
  if (params.limit) query.set('limit', String(params.limit));
  if (params.q) query.set('q', params.q);
  const qs = query.toString();
  return apiGet<CustomerListResponse>(`/v1/customers${qs ? `?${qs}` : ''}`);
}

export function getCustomer(id: string): Promise<Customer> {
  return apiGet<Customer>(`/v1/customers/${id}`);
}

export function createCustomer(input: CustomerInput): Promise<Customer> {
  return apiPost<Customer>('/v1/customers', input);
}

export function updateCustomer(id: string, input: Partial<CustomerInput>): Promise<Customer> {
  return apiPatch<Customer>(`/v1/customers/${id}`, input);
}

export function deleteCustomer(id: string): Promise<void> {
  return apiDelete<void>(`/v1/customers/${id}`);
}

export function listContacts(customerId: string): Promise<Contact[]> {
  return apiGet<Contact[]>(`/v1/customers/${customerId}/contacts`);
}

export function createContact(customerId: string, input: ContactInput): Promise<Contact> {
  return apiPost<Contact>(`/v1/customers/${customerId}/contacts`, input);
}

export function updateContact(
  customerId: string,
  contactId: string,
  input: Partial<ContactInput>,
): Promise<Contact> {
  return apiPatch<Contact>(`/v1/customers/${customerId}/contacts/${contactId}`, input);
}

export function deleteContact(customerId: string, contactId: string): Promise<void> {
  return apiDelete<void>(`/v1/customers/${customerId}/contacts/${contactId}`);
}
