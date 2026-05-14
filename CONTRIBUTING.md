# Contributing to The Copy Platform

Thank you for your interest in contributing to The Copy Platform! We welcome contributions from everyone.

## Code of Conduct

By participating in this project, you agree to abide by our [Code of Conduct](CODE_OF_CONDUCT.md).

## Getting Started

### Prerequisites

- Node.js v20.x (LTS)
- pnpm v8.x
- Docker (for database services)
- Git
- IDE with TypeScript support (VS Code recommended)

### Setting Up Your Development Environment

```bash
# Clone the repository
git clone https://github.com/CLOCKWORK-TEMPTATION/thecopy-platform.git
cd thecopy-platform

# Install dependencies
pnpm install

# Set up environment variables
cp .env.example .env
# Edit .env with your local configuration

# Start development services
pnpm run dev:services

# Start backend in development mode
pnpm run dev:backend

# Start frontend in development mode
pnpm run dev:frontend
```

## Development Workflow

### Branching Strategy

We use **GitHub Flow** with the following branch types:

| Branch Type | Naming Convention | Purpose |
|---|---|---|
| **Main** | `main` | Production-ready code |
| **Feature** | `feature/short-description` | New features |
| **Bugfix** | `bugfix/short-description` | Bug fixes |
| **Hotfix** | `hotfix/short-description` | Critical production fixes |
| **Release** | `release/vX.Y.Z` | Preparation for releases |

### Commit Convention

We follow **Conventional Commits** specification:

```
<type>(<scope>): <subject>
<BLANK LINE>
<body>
<BLANK LINE>
<footer>
```

**Common Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, missing semicolons)
- `refactor`: Code refactoring
- `perf`: Performance improvements
- `test`: Adding or updating tests
- `chore`: Build process or auxiliary tool changes

**Examples:**
```
feat(analysis): add character development analysis
fix(auth): correct JWT token validation
docs(api): update OpenAPI specification
refactor(queue): improve job processing efficiency
```

### Pull Request Process

1. **Create a branch** from `main`
2. **Make your changes** following our coding standards
3. **Write tests** for new functionality
4. **Update documentation** if applicable
5. **Run tests** locally (`pnpm test`)
6. **Push your branch** to GitHub
7. **Open a Pull Request** with:
   - Clear title and description
   - Reference to related issues
   - Screenshots if UI changes
   - Testing instructions
8. **Address review feedback**
9. **Merge** after approval

## Coding Standards

### TypeScript/JavaScript

- **ESLint**: Follow project ESLint configuration
- **Prettier**: Code formatting handled by Prettier
- **Type Safety**: Use TypeScript types extensively
- **Error Handling**: Proper error handling with try/catch
- **Logging**: Use structured logging

### Code Style

```typescript
// Good example
export class ScreenplayAnalyzer {
  private readonly analysisService: AnalysisService;

  constructor(analysisService: AnalysisService) {
    this.analysisService = analysisService;
  }

  public async analyze(text: string): Promise<AnalysisResult> {
    try {
      const result = await this.analysisService.process(text);
      return this.formatResult(result);
    } catch (error) {
      logger.error('Analysis failed', { error, textLength: text.length });
      throw new AnalysisError('Failed to analyze screenplay');
    }
  }

  private formatResult(rawResult: RawAnalysis): AnalysisResult {
    // Format logic here
  }
}
```

### Testing

- **Unit Tests**: Test individual functions and classes
- **Integration Tests**: Test component interactions
- **E2E Tests**: Test complete user flows
- **Test Coverage**: Minimum 80% coverage required

**Testing Example:**
```typescript
describe('ScreenplayAnalyzer', () => {
  let analyzer: ScreenplayAnalyzer;
  let mockAnalysisService: jest.Mocked<AnalysisService>;

  beforeEach(() => {
    mockAnalysisService = {
      process: jest.fn().mockResolvedValue(mockRawResult)
    } as any;

    analyzer = new ScreenplayAnalyzer(mockAnalysisService);
  });

  it('should analyze screenplay text', async () => {
    const result = await analyzer.analyze('INT. COFFEE SHOP - DAY');
    expect(result).toMatchSnapshot();
    expect(mockAnalysisService.process).toHaveBeenCalled();
  });

  it('should handle analysis errors', async () => {
    mockAnalysisService.process.mockRejectedValue(new Error('AI error'));
    await expect(analyzer.analyze('test')).rejects.toThrow(AnalysisError);
  });
});
```

## Project Structure

```
thecopy-platform/
├── apps/                  # Application packages
│   ├── backend/           # Backend service
│   ├── frontend/          # Frontend application
│   └── mobile/            # Mobile app (future)
├── packages/              # Shared packages
│   ├── core/              # Core utilities
│   ├── types/             # Type definitions
│   └── ui/                # UI components
├── docs/                  # Documentation
├── scripts/               # Utility scripts
└── tests/                 # Test suites
```

## Building and Running

### Common Commands

| Command | Description |
|---|---|
| `pnpm install` | Install dependencies |
| `pnpm run build` | Build all packages |
| `pnpm run dev` | Start development mode |
| `pnpm run test` | Run all tests |
| `pnpm run lint` | Run linting |
| `pnpm run format` | Format code |
| `pnpm run start` | Start production server |

### Development Servers

- **Backend**: `http://localhost:3001`
- **Frontend**: `http://localhost:3000`
- **Database**: `localhost:5432` (PostgreSQL)
- **Cache**: `localhost:6379` (Redis)

## Documentation

### Documentation Standards

- **Code Comments**: Use JSDoc for public APIs
- **README Files**: Each package should have a README
- **Architecture Decisions**: Document in `docs/adr/`
- **API Documentation**: Keep OpenAPI spec updated

**JSDoc Example:**
```typescript
/**
 * Analyzes screenplay text and returns structured analysis
 *
 * @param text - Screenplay text to analyze
 * @param options - Analysis options
 * @returns Promise resolving to analysis result
 * @throws AnalysisError if analysis fails
 *
 * @example
 * ```typescript
 * const analyzer = new ScreenplayAnalyzer();
 * const result = await analyzer.analyze('INT. COFFEE SHOP - DAY...');
 * console.log(result.overallScore);
 * ```
 */
public async analyze(text: string, options?: AnalysisOptions): Promise<AnalysisResult> {
  // Implementation
}
```

## Feature Development

### Adding a New Feature

1. **Create an Issue**: Describe the feature and requirements
2. **Design**: Create design documents if needed
3. **Implementation**:
   - Follow existing patterns
   - Add proper error handling
   - Include logging
   - Write tests
4. **Documentation**: Update relevant docs
5. **Review**: Get code review from team

### Feature Checklist

- [ ] Issue created and approved
- [ ] Design documented (if complex)
- [ ] Implementation follows standards
- [ ] Tests written and passing
- [ ] Documentation updated
- [ ] Error handling implemented
- [ ] Logging added
- [ ] Performance considered
- [ ] Security reviewed
- [ ] Code review completed

## Bug Reporting

### Reporting a Bug

1. **Search existing issues** to avoid duplicates
2. **Create a new issue** with:
   - Clear title
   - Steps to reproduce
   - Expected vs actual behavior
   - Screenshots if applicable
   - Environment details
   - Logs if available

### Bug Fix Process

1. **Reproduce** the issue
2. **Identify** root cause
3. **Implement** fix
4. **Write** regression test
5. **Verify** fix works
6. **Document** the fix

## Security

### Reporting Security Issues

**Do not** create public issues for security vulnerabilities. Instead:

1. Email: `security@thecopyplatform.com`
2. Include detailed reproduction steps
3. Expect response within 24 hours

### Security Practices

- **Dependencies**: Keep dependencies updated
- **Secrets**: Never commit secrets to git
- **Input Validation**: Validate all user input
- **Authentication**: Use proper auth mechanisms
- **Logging**: Don't log sensitive data

## Release Process

### Versioning

We use **Semantic Versioning** (SemVer):

- **MAJOR**: Breaking changes
- **MINOR**: New features (backwards compatible)
- **PATCH**: Bug fixes (backwards compatible)

### Release Checklist

- [ ] All tests passing
- [ ] Documentation updated
- [ ] CHANGELOG updated
- [ ] Version bumped
- [ ] Dependencies updated
- [ ] Security audit passed
- [ ] Performance tests passed
- [ ] Approval obtained

## Community

### Ways to Contribute

- **Code**: Fix bugs, add features
- **Documentation**: Improve docs
- **Tests**: Add missing tests
- **Bug Reports**: Report issues
- **Feature Requests**: Suggest improvements
- **Community Support**: Help others

### Getting Help

- **Slack**: Join our community Slack
- **GitHub Discussions**: Ask questions
- **Email**: `support@thecopyplatform.com`

## License

By contributing to The Copy Platform, you agree that your contributions will be licensed under the **MIT License**.

---

**Thank you for contributing!** Your efforts help make The Copy Platform better for everyone.

_meta:
- last_commit: 611b9381dcc0d2254c094172bcca1c7edf12fa67
- date: 2026-05-11
- reference: CONTRIBUTING.md:1-200