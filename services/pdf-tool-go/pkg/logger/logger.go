package logger

import (
	"github.com/sirupsen/logrus"
)

type Logger interface {
	Debug(msg string, keysAndValues ...interface{})
	Info(msg string, keysAndValues ...interface{})
	Warn(msg string, keysAndValues ...interface{})
	Error(msg string, keysAndValues ...interface{})
}

type logrusLogger struct {
	logger *logrus.Logger
}

func New(level, format string) Logger {
	log := logrus.New()

	if format == "json" {
		log.SetFormatter(&logrus.JSONFormatter{})
	}

	lvl, err := logrus.ParseLevel(level)
	if err != nil {
		lvl = logrus.InfoLevel
	}
	log.SetLevel(lvl)

	return &logrusLogger{logger: log}
}

func (l *logrusLogger) Debug(msg string, keysAndValues ...interface{}) {
	l.logger.WithFields(parseFields(keysAndValues...)).Debug(msg)
}

func (l *logrusLogger) Info(msg string, keysAndValues ...interface{}) {
	l.logger.WithFields(parseFields(keysAndValues...)).Info(msg)
}

func (l *logrusLogger) Warn(msg string, keysAndValues ...interface{}) {
	l.logger.WithFields(parseFields(keysAndValues...)).Warn(msg)
}

func (l *logrusLogger) Error(msg string, keysAndValues ...interface{}) {
	l.logger.WithFields(parseFields(keysAndValues...)).Error(msg)
}

func parseFields(keysAndValues ...interface{}) logrus.Fields {
	fields := logrus.Fields{}
	for i := 0; i < len(keysAndValues); i += 2 {
		if i+1 < len(keysAndValues) {
			key, ok := keysAndValues[i].(string)
			if ok {
				fields[key] = keysAndValues[i+1]
			}
		}
	}
	return fields
}
