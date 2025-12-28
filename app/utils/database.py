"""
Database utilities for connection pooling and read replica support.
"""

from contextlib import contextmanager
from typing import Optional
import os

from flask import current_app
from sqlalchemy import create_engine, event
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import QueuePool


class DatabaseManager:
    """
    Database connection manager with support for:
    - Connection pooling
    - Read replicas
    - Health checks
    """
    
    def __init__(self):
        self._primary_engine = None
        self._replica_engines = []
        self._replica_index = 0
    
    def init_app(self, app):
        """Initialize database engines from app config."""
        # Primary database (read/write)
        primary_url = app.config['SQLALCHEMY_DATABASE_URI']
        self._primary_engine = create_engine(
            primary_url,
            poolclass=QueuePool,
            pool_size=int(os.getenv('DB_POOL_SIZE', 20)),
            max_overflow=int(os.getenv('DB_MAX_OVERFLOW', 40)),
            pool_pre_ping=True,  # Check connection health
            pool_recycle=300,  # Recycle connections after 5 minutes
            pool_timeout=30,
            echo=app.config.get('SQLALCHEMY_ECHO', False)
        )
        
        # Read replicas (optional)
        replica_urls = app.config.get('SQLALCHEMY_READ_REPLICA_URIS', [])
        for url in replica_urls:
            engine = create_engine(
                url,
                poolclass=QueuePool,
                pool_size=int(os.getenv('DB_REPLICA_POOL_SIZE', 10)),
                max_overflow=20,
                pool_pre_ping=True,
                pool_recycle=300
            )
            self._replica_engines.append(engine)
        
        # Register event listeners
        self._register_events()
    
    def _register_events(self):
        """Register SQLAlchemy event listeners for monitoring."""
        @event.listens_for(self._primary_engine, 'before_cursor_execute')
        def before_cursor_execute(conn, cursor, statement, parameters, context, executemany):
            conn.info.setdefault('query_start_time', []).append(
                current_app.extensions.get('timing', {}).get('start', 0)
            )
        
        @event.listens_for(self._primary_engine, 'after_cursor_execute')
        def after_cursor_execute(conn, cursor, statement, parameters, context, executemany):
            # Log slow queries
            query_times = conn.info.get('query_start_time', [])
            if query_times:
                start_time = query_times.pop()
                # Could add metrics collection here
    
    @property
    def primary(self):
        """Get primary (read/write) engine."""
        return self._primary_engine
    
    @property
    def replica(self):
        """Get a read replica engine using round-robin."""
        if not self._replica_engines:
            return self._primary_engine
        
        engine = self._replica_engines[self._replica_index]
        self._replica_index = (self._replica_index + 1) % len(self._replica_engines)
        return engine
    
    @contextmanager
    def session(self, read_only: bool = False):
        """
        Context manager for database sessions.
        
        Args:
            read_only: Use read replica if available
        """
        engine = self.replica if read_only and self._replica_engines else self.primary
        Session = sessionmaker(bind=engine)
        session = Session()
        
        try:
            yield session
            session.commit()
        except Exception:
            session.rollback()
            raise
        finally:
            session.close()
    
    def health_check(self) -> dict:
        """Check database connectivity."""
        result = {
            'primary': False,
            'replicas': []
        }
        
        try:
            with self._primary_engine.connect() as conn:
                conn.execute("SELECT 1")
            result['primary'] = True
        except Exception as e:
            result['primary_error'] = str(e)
        
        for i, engine in enumerate(self._replica_engines):
            try:
                with engine.connect() as conn:
                    conn.execute("SELECT 1")
                result['replicas'].append({'index': i, 'healthy': True})
            except Exception as e:
                result['replicas'].append({'index': i, 'healthy': False, 'error': str(e)})
        
        return result
    
    def get_pool_status(self) -> dict:
        """Get connection pool statistics."""
        pool = self._primary_engine.pool
        return {
            'pool_size': pool.size(),
            'checked_in': pool.checkedin(),
            'checked_out': pool.checkedout(),
            'overflow': pool.overflow(),
            'invalid': pool.invalidatedcount() if hasattr(pool, 'invalidatedcount') else 0
        }


# Global instance
db_manager = DatabaseManager()


def get_read_session():
    """Get a read-only session using replica."""
    return db_manager.session(read_only=True)


def get_write_session():
    """Get a read-write session using primary."""
    return db_manager.session(read_only=False)
