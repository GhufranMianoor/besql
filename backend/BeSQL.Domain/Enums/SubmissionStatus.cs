namespace BeSQL.Domain.Enums;

public enum SubmissionStatus
{
    Pending          = 0,
    Running          = 1,
    Accepted         = 2,
    WrongAnswer      = 3,
    RuntimeError     = 4,
    TimeLimitExceeded = 5,
    CompileError     = 6,
    PlagiarismFlag   = 7,
}
