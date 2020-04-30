defaults=struct(
  cipd_package="infra/recipe_bundles/chromium.googlesource.com/chromium/tools/build",
  cipd_version="refs/heads/master",
  swarming_tags=["vpython:native-python-wrapper"],
  repo="https://chromium.googlesource.com/devtools/devtools-frontend",
  favicon="https://storage.googleapis.com/chrome-infra-public/logo/devtools.png",

  # Forward on luci.builder.defaults so users have a consistent interface
  **{a: getattr(luci.builder.defaults, a) for a in dir(luci.builder.defaults)}
)

goma_rbe_prod_default= {
  "$build/goma" : {
    "server_host": "goma.chromium.org",
    "rpc_extra_params": "?prod",
  },
}

acls=struct(
  readers=acl.entry(
    roles=acl.BUILDBUCKET_READER,
    groups='all',
  ),
)

dimensions=struct(
  ubuntu={
    "os":"Ubuntu-16.04",
  },
  default_ubuntu={
    'host_class':'default',
    'os':'Ubuntu-16.04',
  },
  beefy_ubuntu={
    "host_class":"beefy",
    "os":"Ubuntu-16.04",
  },
  win10={
    "cpu":"x86-64",
    "os":"Windows-10",
  },
  mac={
    "cpu":"x86-64",
    "os":"Mac-10.14",
  }
)

def recipe(
    name,
    cipd_package=defaults.cipd_package,
    cipd_version=defaults.cipd_version):
  """Create recipe declaration with dtf defaults"""
  return luci.recipe(
    name=name,
    cipd_package=cipd_package,
    cipd_version=cipd_version,
  )

def builder(
    recipe_name,
    swarming_tags=defaults.swarming_tags,
    **kvargs):
  """Create builder with dtf defaults"""
  mastername = kvargs.pop('mastername')

  properties = dict(kvargs.pop('properties', {}))
  properties.update(mastername=mastername)
  properties.update(goma_rbe_prod_default)
  kvargs['properties'] = properties

  kvargs['executable'] = recipe(recipe_name)

  luci.builder(
    swarming_tags=swarming_tags,
    **kvargs
  )

os_dimensions = {
  "linux": dimensions.default_ubuntu,
  "win64": dimensions.win10,
  "mac": dimensions.mac,
}

def builder_coverage(covered_oss, buider_factory, builder_name_pattern, **kvargs):
  for os in covered_oss:
    buider_factory(
      dimensions=os_dimensions[os],
      name= builder_name_pattern % os,
      **kvargs
    )

def config_section(name, branch,
    view=None,
    name_suffix=None,
    mastername="client.devtools-frontend.integration",
    repo=defaults.repo):
  view = view or name.capitalize()
  if name_suffix == None:
    name_suffix = " %s" % name
  return struct(
    name=name,
    branch=branch,
    repo=repo,
    view=view,
    name_suffix=name_suffix,
    mastername=mastername,
  )

def builder_descriptor(name, recipe_name, excluded_from=[]):
  return struct(
    name=name,
    recipe_name=recipe_name,
    excluded_from=excluded_from
  )

def generate_ci_configs(configurations, builders):
  # Generate full configuration for ci builders:
  #   bucket, builders, console, scheduler.
  # Arguments:
  #   - configurations: [] of config_section
  #   - builders: [] of builder_descriptor

  SERVICE_ACCOUNT='devtools-frontend-ci-builder@chops-service-accounts.iam.gserviceaccount.com'

  luci.bucket(
      name="ci",
      acls=[
        acls.readers,
        acl.entry(
            roles=acl.BUILDBUCKET_TRIGGERER,
            users=[
              SERVICE_ACCOUNT,
              'luci-scheduler@appspot.gserviceaccount.com',
            ]
        ),
      ],
  )

  all_builder_refs = []
  for c in configurations:
    builders_refs=[]

    def ci_builder(**kvargs):
      category=kvargs.pop('console_category')
      builder(
          bucket="ci",
          mastername=c.mastername,
          service_account=SERVICE_ACCOUNT,
          schedule="triggered",
          properties=goma_rbe_prod_default,
          **kvargs
      )
      builders_refs.append((kvargs['name'], category))

    for b in builders:
      if c.name not in b.excluded_from:
        ci_builder(
          name=b.name + c.name_suffix,
          recipe_name=b.recipe_name,
          dimensions=dimensions.default_ubuntu,
          execution_timeout=2 * time.hour,
          console_category='Linux'
        )

    luci.console_view(
      name=c.view.lower(),
      title=c.view,
      repo=c.repo,
      refs=[c.branch],
      favicon=defaults.favicon,
      header={
        'tree_status_host': 'devtools-status.appspot.com'
      },
      entries=[
        luci.console_view_entry(builder=name, category=category)
        for name, category in builders_refs
      ]
    )

    luci.gitiles_poller(
      name='devtools-frontend-trigger-' + c.name,
      bucket="ci",
      repo=c.repo,
      refs=[c.branch],
      triggers=[name for name, _ in builders_refs]
    )
