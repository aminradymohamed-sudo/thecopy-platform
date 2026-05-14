# Operations Runbook

## Service Ownership

| Service | Owner | Contact | SLO |
|---|---|---|---|
| Backend API | Backend Team | backend@thecopyplatform.com | 99.9% uptime |
| Web Application | Frontend Team | frontend@thecopyplatform.com | 99.5% uptime |
| Database | DevOps Team | devops@thecopyplatform.com | 99.99% uptime |
| Redis Cache | DevOps Team | devops@thecopyplatform.com | 99.9% uptime |
| Queue System | DevOps Team | devops@thecopyplatform.com | 99.5% uptime |
| AI Services | AI Team | ai@thecopyplatform.com | 99.0% uptime |

## Common Alerts

### Alert: High CPU Utilization

**Trigger:** CPU > 90% for 5 minutes

**Diagnosis:**
1. Check CloudWatch metrics for CPU usage patterns
2. Identify top CPU-consuming processes
3. Check for runaway jobs or infinite loops
4. Review recent deployments

**Resolution:**
1. Scale out ECS tasks temporarily
2. Restart affected containers
3. Rollback recent deployment if correlated
4. Optimize CPU-intensive operations

**Escalation:** If CPU remains high after scaling, escalate to DevOps Lead

### Alert: High Error Rate

**Trigger:** Error rate > 5% for 5 minutes

**Diagnosis:**
1. Check Sentry for error details
2. Review recent code changes
3. Check database and external service connectivity
4. Examine request patterns

**Resolution:**
1. Rollback recent deployment if error rate spikes after deployment
2. Fix specific errors identified in Sentry
3. Add circuit breakers for failing external services
4. Implement rate limiting if under attack

**Escalation:** If error rate exceeds 10%, escalate immediately

### Alert: Database Connection Issues

**Trigger:** Database connection pool > 90% utilization

**Diagnosis:**
1. Check RDS performance metrics
2. Review slow query logs
3. Check for connection leaks
4. Examine recent query pattern changes

**Resolution:**
1. Increase connection pool size temporarily
2. Optimize slow queries
3. Fix connection leaks in application code
4. Add query timeouts
5. Consider read replicas if read-heavy

**Escalation:** If database becomes unresponsive, escalate to DBA

### Alert: Queue Backlog

**Trigger:** Queue length > 1000 jobs

**Diagnosis:**
1. Check BullMQ dashboard for queue status
2. Review worker health and count
3. Examine job processing times
4. Check for stuck jobs

**Resolution:**
1. Scale up queue workers
2. Clear stuck jobs if safe
3. Optimize job processing
4. Implement backpressure if needed
5. Consider prioritizing critical jobs

**Escalation:** If queue length exceeds 5000, escalate to DevOps

### Alert: Memory Leak Detected

**Trigger:** Memory usage grows >10% per hour

**Diagnosis:**
1. Capture heap dumps
2. Analyze memory usage patterns
3. Review recent code changes
4. Check for unclosed resources

**Resolution:**
1. Restart affected containers
2. Fix memory leaks in code
3. Implement memory limits
4. Add memory monitoring
5. Consider smaller container sizes

**Escalation:** If memory leak causes OOM kills, escalate immediately

## Incident Response Procedures

### Incident Severity Levels

| Level | Description | Response Time | Impact |
|---|---|---|---|
| SEV-1 | Critical production outage | Immediate | Complete service unavailable |
| SEV-2 | Major functionality degraded | <15 minutes | Core features unavailable |
| SEV-3 | Minor functionality impacted | <30 minutes | Non-critical features affected |
| SEV-4 | Cosmetic or non-functional issue | <1 hour | No user impact |

### Incident Response Process

1. **Detection**: Monitor alerts and user reports
2. **Triage**: Assess severity and impact
3. **Notification**: Alert response team
4. **Diagnosis**: Identify root cause
5. **Mitigation**: Implement temporary fix
6. **Resolution**: Apply permanent fix
7. **Recovery**: Restore full service
8. **Review**: Post-incident analysis

### Incident Communication

**Internal Communication:**
- Slack channel: `#incidents`
- Zoom bridge: Company-wide incident bridge
- Status page: Internal status dashboard

**External Communication:**
- Status page: `https://status.thecopyplatform.com`
- Twitter: `@thecopy_status`
- Email: Updates to affected users

## Known Issues and Workarounds

### Issue: Slow Screenplay Analysis

**Symptoms:** Analysis jobs taking >5 minutes

**Root Cause:** AI model response times or inefficient processing

**Workaround:**
1. Split large screenplays into chunks
2. Use simpler analysis modes
3. Increase worker count temporarily
4. Implement caching for repeated analyses

**Permanent Fix:** Optimize AI model calls and processing pipeline

### Issue: WebSocket Connection Drops

**Symptoms:** Frequent WebSocket disconnections

**Root Cause:** Load balancer idle timeout or network issues

**Workaround:**
1. Implement automatic reconnection
2. Increase heartbeat interval
3. Use exponential backoff for reconnects
4. Add client-side buffering

**Permanent Fix:** Configure proper load balancer timeouts

### Issue: Authentication Token Expiry

**Symptoms:** Users logged out unexpectedly

**Root Cause:** Token expiration or clock skew

**Workaround:**
1. Implement token refresh logic
2. Extend token lifetime temporarily
3. Add grace period for expired tokens
4. Improve error messaging

**Permanent Fix:** Implement proper token rotation

### Issue: Database Deadlocks

**Symptoms:** Transactions timing out

**Root Cause:** Concurrent transactions on same resources

**Workaround:**
1. Implement retry logic
2. Reduce transaction scope
3. Add deadlock detection
4. Optimize query order

**Permanent Fix:** Review transaction design and isolation levels

## Troubleshooting Guide

### API Response Issues

| Symptom | Possible Cause | Solution |
|---|---|---|
| 500 Internal Server Error | Server-side exception | Check logs, restart service |
| 503 Service Unavailable | Service overload | Scale up, check dependencies |
| 429 Too Many Requests | Rate limiting | Wait, implement backoff |
| 401 Unauthorized | Invalid credentials | Re-authenticate, check token |
| 404 Not Found | Invalid endpoint | Check API documentation |

### Database Issues

| Symptom | Possible Cause | Solution |
|---|---|---|
| Connection timeout | Database overload | Check RDS metrics, scale up |
| Query timeout | Slow query | Optimize query, add indexes |
| Deadlock | Concurrent transactions | Review transaction logic |
| Connection leaks | Unclosed connections | Fix application code |

### Cache Issues

| Symptom | Possible Cause | Solution |
|---|---|---|
| Cache misses | Cache eviction | Increase cache size |
| Stale data | TTL too long | Adjust TTL settings |
| Connection errors | Redis overload | Scale Redis cluster |
| Memory pressure | Large keys | Optimize key sizes |

### Queue Issues

| Symptom | Possible Cause | Solution |
|---|---|---|
| Jobs stuck | Worker crash | Restart workers |
| Slow processing | Inefficient jobs | Optimize job logic |
| Queue backlog | High load | Scale workers |
| Job failures | Bug in job | Fix job implementation |

## On-Call Procedures

### On-Call Responsibilities

1. **Monitor alerts** and respond within SLA
2. **Acknowledge incidents** in Slack
3. **Follow runbook procedures** for known issues
4. **Escalate** when needed
5. **Document** all actions taken
6. **Communicate** status updates
7. **Handoff** to next shift if unresolved

### Handoff Checklist

- [ ] Incident status documented
- [ ] Current actions summarized
- [ ] Next steps identified
- [ ] Stakeholders notified
- [ ] Handoff call completed
- [ ] Documentation updated

### Shift Handoff Template

**Incident:** [ID] - [Brief Description]
**Status:** [Active/Resolved/Monitoring]
**Severity:** [SEV-1/2/3/4]
**Start Time:** [YYYY-MM-DD HH:MM]
**Current Actions:**
- [ ] Action 1
- [ ] Action 2
**Next Steps:**
- [ ] Step 1
- [ ] Step 2
**Open Questions:**
- Question 1?
- Question 2?
**Stakeholders Notified:** [List]

## Maintenance Procedures

### Scheduled Maintenance

| Task | Frequency | Window | Owner |
|---|---|---|---|
| Database maintenance | Weekly | Sun 2-4 AM UTC | DBA |
| Cache maintenance | Weekly | Sun 2-4 AM UTC | DevOps |
| Log rotation | Daily | 12 AM UTC | DevOps |
| Backup verification | Weekly | Sat 2-4 AM UTC | DevOps |
| Security updates | Monthly | First Sun | DevOps |

### Maintenance Checklist

- [ ] Announce maintenance window
- [ ] Backup critical data
- [ ] Disable monitoring alerts
- [ ] Perform maintenance tasks
- [ ] Verify system health
- [ ] Re-enable monitoring
- [ ] Update documentation
- [ ] Communicate completion

## Security Incident Response

### Security Incident Types

| Type | Example | Response |
|---|---|---|
| Data Breach | Unauthorized data access | Containment, investigation, notification |
| DDoS Attack | Traffic flood | Traffic filtering, rate limiting |
| Injection Attack | SQL injection | Patch vulnerability, review logs |
| Authentication Bypass | Unauthorized access | Revoke tokens, investigate |
| Malware | Infected systems | Isolate, clean, restore |

### Security Incident Process

1. **Contain**: Isolate affected systems
2. **Preserve**: Collect forensic evidence
3. **Assess**: Determine scope and impact
4. **Eradicate**: Remove malicious presence
5. **Recover**: Restore affected systems
6. **Review**: Post-incident analysis
7. **Report**: Regulatory notification if required

### Data Breach Response

1. **Immediate Actions:**
   - Isolate affected systems
   - Revoke compromised credentials
   - Preserve logs and evidence
   - Notify security team

2. **Investigation:**
   - Determine data accessed
   - Identify vulnerability
   - Assess legal requirements

3. **Notification:**
   - Notify affected users
   - Regulatory reporting if required
   - Public disclosure if significant

4. **Remediation:**
   - Patch vulnerability
   - Enhance monitoring
   - Implement additional controls

## Performance Tuning

### Performance Issues

| Issue | Metric | Threshold | Solution |
|---|---|---|---|
| Slow API responses | P95 response time | >500ms | Optimize queries, add caching |
| High CPU usage | CPU utilization | >80% | Scale up, optimize code |
| Memory pressure | Memory usage | >90% | Scale up, fix leaks |
| Database load | Query time | >1s | Add indexes, optimize queries |
| Cache misses | Cache hit ratio | <90% | Increase cache size, adjust TTL |

### Performance Optimization Techniques

1. **Caching**: Implement Redis caching for frequent queries
2. **Query Optimization**: Add indexes, optimize joins
3. **Connection Pooling**: Properly size database connection pools
4. **Batch Processing**: Combine multiple operations
5. **Lazy Loading**: Load data only when needed
6. **Compression**: Enable gzip compression
7. **CDN**: Use CloudFront for static assets

## Backup and Recovery

### Backup Verification

**Monthly Backup Test Procedure:**

1. Restore backup to test environment
2. Verify database integrity
3. Test application functionality
4. Validate data consistency
5. Document results

### Recovery Time Objectives

| System | RTO | Recovery Procedure |
|---|---|---|
| Database | 30 min | Restore from snapshot |
| Application | 15 min | Redeploy containers |
| Cache | 5 min | Restart Redis cluster |
| Files | 1 hour | Restore from S3 versioning |

## Monitoring and Alerting

### Key Metrics to Monitor

| Category | Metric | Alert Threshold |
|---|---|---|
| **Application** | Response time | >500ms |
| **Application** | Error rate | >2% |
| **Application** | Request rate | >10,000 RPM |
| **Database** | Connection count | >400 |
| **Database** | Query time | >1s |
| **Cache** | Memory usage | >80% |
| **Cache** | Hit ratio | <90% |
| **Queue** | Job count | >1000 |
| **Queue** | Processing time | >30s |
| **Infrastructure** | CPU usage | >80% |
| **Infrastructure** | Memory usage | >90% |

### Alert Escalation Policy

| Alert Type | Initial Response | Escalation Time | Escalation Target |
|---|---|---|---|
| Critical | Immediate | 15 min no response | DevOps Lead |
| High | <5 min | 30 min no resolution | Engineering Manager |
| Medium | <15 min | 1 hour no progress | Team Lead |
| Low | <30 min | 2 hours no update | Documentation |

## Post-Incident Review

### Incident Review Template

**Incident ID:** [ID]
**Date:** [YYYY-MM-DD]
**Start Time:** [HH:MM UTC]
**End Time:** [HH:MM UTC]
**Duration:** [X hours Y minutes]
**Severity:** [SEV-1/2/3/4]
**Impact:** [Description of user impact]

**Root Cause:**
[Detailed explanation of what caused the incident]

**Timeline:**
- [HH:MM] Incident detected
- [HH:MM] Initial response
- [HH:MM] Root cause identified
- [HH:MM] Mitigation applied
- [HH:MM] Full resolution
- [HH:MM] Service restored

**Response Actions:**
1. [Action taken]
2. [Action taken]
3. [Action taken]

**What Went Well:**
- [Positive aspect]
- [Positive aspect]

**What Could Be Improved:**
- [Area for improvement]
- [Area for improvement]

**Action Items:**
- [ ] Action item 1 (Owner: [Name], Due: [Date])
- [ ] Action item 2 (Owner: [Name], Due: [Date])
- [ ] Action item 3 (Owner: [Name], Due: [Date])

**Lessons Learned:**
[Key takeaways from the incident]

**Follow-up:**
- [ ] Schedule review meeting
- [ ] Update documentation
- [ ] Implement preventative measures

## Contact Information

### Emergency Contacts

| Role | Name | Phone | Email |
|---|---|---|---|
| DevOps Lead | John Smith | +1-555-123-4567 | john@thecopyplatform.com |
| Backend Lead | Sarah Johnson | +1-555-234-5678 | sarah@thecopyplatform.com |
| DBA | Mike Brown | +1-555-345-6789 | mike@thecopyplatform.com |
| Security | Emily Davis | +1-555-456-7890 | emily@thecopyplatform.com |

### Vendor Contacts

| Vendor | Support Contact | Phone | Portal |
|---|---|---|---|
| AWS | AWS Support | +1-555-678-9012 | https://aws.amazon.com/support |
| MongoDB | MongoDB Support | +1-555-789-0123 | https://support.mongodb.com |
| Sentry | Sentry Support | +1-555-890-1234 | https://sentry.io/support |
| Cloudflare | Cloudflare Support | +1-555-901-2345 | https://support.cloudflare.com |

_meta:
- last_commit: 611b9381dcc0d2254c094172bcca1c7edf12fa67
- date: 2026-05-11
- reference: docs/operations/RUNBOOK.md:1-200