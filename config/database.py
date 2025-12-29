"""
Database Configuration Module.

PostgreSQL bağlantı ve havuz yapılandırması.
SQLAlchemy engine ve session yönetimi.

DevOps Best Practices:
    - Connection pooling
    - Read replicas desteği
    - Health checks
    - Failover yönetimi
"""

import os
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, Tuple
from contextlib import contextmanager
from urllib.parse import urlparse, parse_qs
import logging

from sqlalchemy import create_engine, event, text
from sqlalchemy.engine import Engine
from sqlalchemy.orm import sessionmaker, scoped_session, Session
from sqlalchemy.pool import QueuePool, NullPool, StaticPool


logger = logging.getLogger(__name__)


@dataclass
class DatabaseConfig:
    """
    PostgreSQL veritabanı yapılandırması.
    
    Connection pooling, read replicas ve health check ayarları.
    """
    
    # ========================================
    # Primary Database
    # ========================================
    url: str = "postgresql://postgres:password@localhost:5432/student_coaching"
    
    # Connection Details (alternatif)
    host: str = "localhost"
    port: int = 5432
    database: str = "student_coaching"
    username: str = "postgres"
    password: str = "password"
    schema: str = "public"
    
    # ========================================
    # Connection Pool Settings
    # ========================================
    pool_size: int = 5  # Minimum connection sayısı
    pool_max_overflow: int = 10  # Pool dolduğunda ek connection
    pool_timeout: int = 30  # Connection bekleme süresi (saniye)
    pool_recycle: int = 1800  # Connection yenileme süresi (30 dk)
    pool_pre_ping: bool = True  # Connection health check
    
    # ========================================
    # Query Settings
    # ========================================
    echo: bool = False  # SQL query logging
    echo_pool: bool = False  # Pool event logging
    query_timeout: int = 30  # Query timeout (saniye)
    slow_query_threshold: float = 1.0  # Yavaş query uyarı eşiği (saniye)
    
    # ========================================
    # Read Replicas (Okuma optimizasyonu)
    # ========================================
    read_replicas_enabled: bool = False
    read_replica_urls: List[str] = field(default_factory=list)
    
    # ========================================
    # SSL Configuration
    # ========================================
    ssl_enabled: bool = False
    ssl_ca_cert: Optional[str] = None
    ssl_client_cert: Optional[str] = None
    ssl_client_key: Optional[str] = None
    ssl_verify: bool = True
    
    # ========================================
    # Encoding & Timezone
    # ========================================
    encoding: str = "utf8"
    timezone: str = "Europe/Istanbul"
    
    @property
    def connection_string(self) -> str:
        """
        Bağlantı string'i oluştur.
        
        Önce url kullanılır, yoksa detaylı bağlantı bilgilerinden oluşturulur.
        """
        if self.url and self.url != "postgresql://postgres:password@localhost:5432/student_coaching":
            return self.url
        
        return f"postgresql://{self.username}:{self.password}@{self.host}:{self.port}/{self.database}"
    
    @property
    def engine_options(self) -> Dict[str, Any]:
        """SQLAlchemy engine ayarları."""
        options = {
            'pool_size': self.pool_size,
            'max_overflow': self.pool_max_overflow,
            'pool_timeout': self.pool_timeout,
            'pool_recycle': self.pool_recycle,
            'pool_pre_ping': self.pool_pre_ping,
            'echo': self.echo,
            'echo_pool': self.echo_pool,
            'poolclass': QueuePool,
        }
        
        # SSL ayarları
        if self.ssl_enabled:
            connect_args = {'sslmode': 'require' if self.ssl_verify else 'prefer'}
            if self.ssl_ca_cert:
                connect_args['sslrootcert'] = self.ssl_ca_cert
            if self.ssl_client_cert:
                connect_args['sslcert'] = self.ssl_client_cert
            if self.ssl_client_key:
                connect_args['sslkey'] = self.ssl_client_key
            options['connect_args'] = connect_args
        
        return options


class DatabaseManager:
    """
    Veritabanı bağlantı yöneticisi.
    
    Engine, session ve health check yönetimi.
    Read/write splitting desteği.
    """
    
    def __init__(self, config: DatabaseConfig = None):
        self.config = config or DatabaseConfig()
        self._engine: Optional[Engine] = None
        self._read_engines: List[Engine] = []
        self._session_factory = None
        self._scoped_session = None
        self._current_replica_index = 0
    
    def init_app(self, app=None):
        """
        Flask uygulamasına entegre et.
        
        App context ile session yönetimi.
        """
        if app:
            # Config'i ortam değişkenlerinden yükle
            self.config.url = app.config.get('SQLALCHEMY_DATABASE_URI', self.config.url)
            self.config.echo = app.config.get('SQLALCHEMY_ECHO', self.config.echo)
            
            engine_options = app.config.get('SQLALCHEMY_ENGINE_OPTIONS', {})
            for key, value in engine_options.items():
                if hasattr(self.config, key):
                    setattr(self.config, key, value)
            
            # Engine oluştur
            self.create_engine()
            
            # App context cleanup
            @app.teardown_appcontext
            def shutdown_session(exception=None):
                self.remove_session()
    
    def create_engine(self) -> Engine:
        """
        SQLAlchemy engine oluştur.
        
        Returns:
            Engine instance
        """
        if self._engine:
            return self._engine
        
        self._engine = create_engine(
            self.config.connection_string,
            **self.config.engine_options
        )
        
        # Event listeners
        self._setup_event_listeners(self._engine)
        
        # Read replicas
        if self.config.read_replicas_enabled and self.config.read_replica_urls:
            for url in self.config.read_replica_urls:
                replica_engine = create_engine(url, **self.config.engine_options)
                self._setup_event_listeners(replica_engine)
                self._read_engines.append(replica_engine)
        
        # Session factory
        self._session_factory = sessionmaker(bind=self._engine)
        self._scoped_session = scoped_session(self._session_factory)
        
        logger.info(f"Database engine created: {self._mask_password(self.config.connection_string)}")
        
        return self._engine
    
    def _setup_event_listeners(self, engine: Engine):
        """Engine event listener'larını ayarla."""
        
        # Yavaş query logging
        @event.listens_for(engine, "before_cursor_execute")
        def before_cursor_execute(conn, cursor, statement, parameters, context, executemany):
            conn.info.setdefault('query_start_time', []).append(
                __import__('time').time()
            )
        
        @event.listens_for(engine, "after_cursor_execute")
        def after_cursor_execute(conn, cursor, statement, parameters, context, executemany):
            total_time = __import__('time').time() - conn.info['query_start_time'].pop()
            if total_time >= self.config.slow_query_threshold:
                logger.warning(
                    f"Slow query ({total_time:.2f}s): {statement[:200]}..."
                )
        
        # Connection checkout logging
        @event.listens_for(engine, "checkout")
        def receive_checkout(dbapi_connection, connection_record, connection_proxy):
            logger.debug("Connection checked out from pool")
        
        @event.listens_for(engine, "checkin")
        def receive_checkin(dbapi_connection, connection_record):
            logger.debug("Connection returned to pool")
    
    @property
    def engine(self) -> Engine:
        """Primary engine döner."""
        if not self._engine:
            self.create_engine()
        return self._engine
    
    @property
    def read_engine(self) -> Engine:
        """
        Okuma için engine döner.
        
        Read replicas varsa round-robin ile seçilir.
        """
        if not self._read_engines:
            return self.engine
        
        # Round-robin selection
        engine = self._read_engines[self._current_replica_index]
        self._current_replica_index = (self._current_replica_index + 1) % len(self._read_engines)
        return engine
    
    @property
    def session(self) -> Session:
        """Scoped session döner."""
        if not self._scoped_session:
            self.create_engine()
        return self._scoped_session()
    
    def remove_session(self):
        """Session'ı temizle."""
        if self._scoped_session:
            self._scoped_session.remove()
    
    @contextmanager
    def get_session(self, read_only: bool = False):
        """
        Context manager ile session al.
        
        Args:
            read_only: Sadece okuma için (replica kullanılır)
        
        Yields:
            Session instance
        
        Example:
            with db.get_session() as session:
                user = session.query(User).first()
        """
        engine = self.read_engine if read_only else self.engine
        session = sessionmaker(bind=engine)()
        
        try:
            yield session
            session.commit()
        except Exception:
            session.rollback()
            raise
        finally:
            session.close()
    
    @contextmanager
    def transaction(self):
        """
        Explicit transaction context manager.
        
        Example:
            with db.transaction() as session:
                session.add(user)
                session.add(profile)
                # Tüm işlemler birlikte commit edilir
        """
        session = self.session
        try:
            yield session
            session.commit()
        except Exception:
            session.rollback()
            raise
    
    def health_check(self) -> Dict[str, Any]:
        """
        Veritabanı sağlık kontrolü.
        
        Returns:
            Health check sonuçları
        """
        result = {
            'status': 'healthy',
            'primary': {'status': 'unknown'},
            'replicas': [],
            'pool': {}
        }
        
        # Primary check
        try:
            with self.engine.connect() as conn:
                conn.execute(text("SELECT 1"))
                result['primary'] = {
                    'status': 'healthy',
                    'url': self._mask_password(self.config.connection_string)
                }
        except Exception as e:
            result['status'] = 'unhealthy'
            result['primary'] = {
                'status': 'unhealthy',
                'error': str(e)
            }
        
        # Replica checks
        for i, engine in enumerate(self._read_engines):
            try:
                with engine.connect() as conn:
                    conn.execute(text("SELECT 1"))
                    result['replicas'].append({
                        'index': i,
                        'status': 'healthy'
                    })
            except Exception as e:
                result['replicas'].append({
                    'index': i,
                    'status': 'unhealthy',
                    'error': str(e)
                })
        
        # Pool stats
        if hasattr(self._engine.pool, 'size'):
            result['pool'] = {
                'size': self._engine.pool.size(),
                'checked_in': self._engine.pool.checkedin(),
                'checked_out': self._engine.pool.checkedout(),
                'overflow': self._engine.pool.overflow(),
            }
        
        return result
    
    def get_pool_status(self) -> Dict[str, int]:
        """Pool durumunu döner."""
        if not self._engine or not hasattr(self._engine.pool, 'size'):
            return {}
        
        pool = self._engine.pool
        return {
            'pool_size': pool.size(),
            'connections_in_pool': pool.checkedin(),
            'connections_in_use': pool.checkedout(),
            'overflow_connections': pool.overflow(),
            'max_overflow': self.config.pool_max_overflow,
        }
    
    def close(self):
        """Tüm bağlantıları kapat."""
        if self._scoped_session:
            self._scoped_session.remove()
        
        if self._engine:
            self._engine.dispose()
            self._engine = None
        
        for engine in self._read_engines:
            engine.dispose()
        self._read_engines = []
        
        logger.info("Database connections closed")
    
    def _mask_password(self, url: str) -> str:
        """URL'deki şifreyi maskele."""
        parsed = urlparse(url)
        if parsed.password:
            masked = url.replace(f":{parsed.password}@", ":****@")
            return masked
        return url


# ========================================
# MIGRATION HELPERS
# ========================================

def run_migrations(database_url: str, migrations_path: str = "migrations"):
    """
    Alembic migration'ları çalıştır.
    
    Args:
        database_url: Database connection string
        migrations_path: Migrations klasör yolu
    """
    from alembic.config import Config
    from alembic import command
    
    alembic_cfg = Config("alembic.ini")
    alembic_cfg.set_main_option("sqlalchemy.url", database_url)
    alembic_cfg.set_main_option("script_location", migrations_path)
    
    command.upgrade(alembic_cfg, "head")
    logger.info("Database migrations completed")


def create_all_tables(engine: Engine, base):
    """
    Tüm tabloları oluştur.
    
    Args:
        engine: SQLAlchemy engine
        base: Declarative base class
    """
    base.metadata.create_all(bind=engine)
    logger.info("Database tables created")


def drop_all_tables(engine: Engine, base):
    """
    Tüm tabloları sil (DİKKAT: Veri kaybı!).
    
    Args:
        engine: SQLAlchemy engine
        base: Declarative base class
    """
    base.metadata.drop_all(bind=engine)
    logger.warning("Database tables dropped")


# ========================================
# QUERY HELPERS
# ========================================

def paginate_query(query, page: int = 1, per_page: int = 20) -> Tuple[list, Dict[str, Any]]:
    """
    Query'yi paginate et.
    
    Args:
        query: SQLAlchemy query
        page: Sayfa numarası (1-based)
        per_page: Sayfa başına kayıt
    
    Returns:
        (items, pagination_info)
    """
    total = query.count()
    items = query.offset((page - 1) * per_page).limit(per_page).all()
    
    total_pages = (total + per_page - 1) // per_page
    
    return items, {
        'page': page,
        'per_page': per_page,
        'total': total,
        'total_pages': total_pages,
        'has_next': page < total_pages,
        'has_prev': page > 1,
    }


# ========================================
# GLOBAL DATABASE INSTANCE
# ========================================

db_manager = DatabaseManager()


def get_db() -> DatabaseManager:
    """Global database manager döner."""
    return db_manager


def init_db(app=None, config: DatabaseConfig = None):
    """
    Database'i initialize et.
    
    Args:
        app: Flask uygulaması
        config: Database config
    """
    global db_manager
    
    if config:
        db_manager = DatabaseManager(config)
    
    if app:
        db_manager.init_app(app)
    else:
        db_manager.create_engine()
    
    return db_manager
