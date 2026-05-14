# Security Policy

## Supported Versions

| Version | Supported          |
|---------|-------------------|
| 1.x     | ✅ Yes             |
| < 1.0   | ❌ No              |

## Reporting a Vulnerability

If you discover a security vulnerability in The Copy Platform, please report it to us immediately:

- **Email**: security@thecopy.ai
- **Response Time**: We will acknowledge your report within 48 hours and provide a more detailed response within 7 days.

## Security Practices

### Authentication & Authorization

- JWT-based authentication with refresh tokens
- Role-based access control (RBAC)
- Password hashing with bcrypt (cost factor 12)
- Rate limiting on authentication endpoints

### Data Protection

- Encryption at rest (AES-256)
- Encryption in transit (TLS 1.2+)
- Regular key rotation
- Secure cookie settings (HttpOnly, Secure, SameSite)

### API Security

- Input validation on all endpoints
- CSRF protection
- CORS restrictions
- Content Security Policy headers
- Security headers (HSTS, XSS protection)

### Infrastructure Security

- Regular vulnerability scanning
- Container security hardening
- Network segmentation
- Intrusion detection systems
- Regular security audits

## Responsible Disclosure

We follow responsible disclosure practices:

1. **Report**: Submit vulnerability report
2. **Acknowledge**: We acknowledge receipt within 48 hours
3. **Investigate**: We investigate and develop a fix
4. **Patch**: We release a security patch
5. **Disclose**: We publicly disclose the vulnerability (with credit)

## Security Updates

Security updates are released as patch versions (e.g., 1.0.1) and include:

- Detailed changelog entries
- CVSS score assessment
- Mitigation instructions
- Affected versions

## Contact

For security-related inquiries, please contact:

- **Security Team**: security@thecopy.ai
- **Emergency**: +1 (555) 123-4567 (24/7)