const config = {
  accessToken: 'pk.eyJ1IjoibWF0dCIsImEiOiJTUHZkajU0In0.oB-OGTMFtpkga8vC48HjIg',
  mapStyle: 'mapbox://styles/matt/cknz37l6m2zuy17n7puoeiqkp',
  sourceLayer: 'grace-great-lakes-corrected-1ctcex',
  title: 'GRACE - Liquid Water Equivalent Thickness (cm)',
  description:
    'Changes in equivalent water thickness (relative to the baseline average over Jan 2004 to Dec 2009) as calculated by JPL from GRACE gravity field observations',
  years: [
    '2002',
    '2003',
    '2004',
    '2005',
    '2006',
    '2007',
    '2008',
    '2009',
    '2010',
    '2011',
    '2012',
    '2013',
    '2014',
    '2015',
    '2016',
    '2017',
    '2018',
    '2019',
    '2020',
    '2021'
  ],

  months: [
    '01',
    '02',
    '03',
    '04',
    '05',
    '06',
    '07',
    '08',
    '09',
    '10',
    '11',
    '12'
  ],
  fields: [],
  dates: ['x'],
  summaryType: 'avg',
  dataSeriesLabel: 'LWE Thickness (Region Avg)',
  sourceId: 'composite',
  legendColors: ['#6a011f', '#c94741', '#f7b596', '#ffffff', '#a9d1e5', '#3885bc', '#053061'],
  legendValues: [-60, -40, -20, 0, 20, 40, '60+']
};

config.years.forEach((year) => {
  config.months.forEach((month) => {
    if (!((year === '2002' && parseInt(month, 10) < 4)
      || (year === '2021' && parseInt(month, 10) > 2))) {
      config.fields.push(year + '-' + month);
      config.dates.push(year + '-' + month + '-01');
    }
  });
});


(updateText = () => {
  document.title = config.title;
  document.getElementById('sidebar-title').textContent = config.title;
  document.getElementById('sidebar-description').innerHTML = config.description;
})();

// Initiate chart
const chart = c3.generate({
  bindto: '#chart',
  data: {
    x: 'x',
    columns: [config.dates,['data', 0, 0]],
    names: { data: config.dataSeriesLabelhi },
    type: 'line',
  },
  axis: {
    x: {
      type: 'timeseries',
      tick: {
        format: '%Y',
        values: ['2005-01-01', '2010-01-01', '2015-01-01', '2020-01-01']
      }
    },
    y: {
      max: 100,
      min: -50
    }
  },
  tooltip: {
      format: {
          title: function (d) { return d.toISOString().substring(0, 7); },
          value: function (value, ratio, id) {
              return value.toFixed(2) + ' cm';
          }
      }
  },
  size: {
    height: 300,
    width: 550
  },
});

let summaryData = [];
document.getElementById('resetButton').onclick = () => {
  if (summaryData) {
    updateChartFromFeatures(summaryData);
  }
  if (bbFull) {
    map.fitBounds(bbFull);
  }
};

mapboxgl.accessToken = config.accessToken;
const map = new mapboxgl.Map({
  container: 'map',
  style: config.mapStyle,
  minZoom: 2
});

var featureCheck;
var hoveredFeatureId = null;
let bbFull;
let defColors = [
                  'interpolate',
                  ['linear'],
                  ['get', '2002-04'],
                  -60,
                  '#6a011f',
                  0,
                  '#ffffff',
                  60,
                  '#053061'
                ];
let defOpacity = [
                    'case',
                    ['boolean', ['feature-state', 'hover'], false],
                    1,
                    0.85
                  ]

map.once('idle', (idleEvent) => {
  map.setPaintProperty(config.sourceLayer, 'fill-opacity', defOpacity);
  map.setPaintProperty(config.sourceLayer, 'fill-color', defColors);

  bbFull = map.getBounds();

  buildLegend();

  map.on('click', onMapClick);

  const sourceFeatures = map.querySourceFeatures(config.sourceId, {
    sourceLayer: config.sourceLayer,
  });
  featureCheck = sourceFeatures[0];
  processSourceFeatures(sourceFeatures);
});

const updateDate = (i) => {
  defColors[2].splice(1, 1, config.fields[i]);
  map.setPaintProperty(config.sourceLayer, 'fill-color', defColors);
};

const onMapClick = (e) => {
  const clickedCoords = e.lngLat.lng.toFixed(2) + ', ' + e.lngLat.lat.toFixed(2);
  const clickedFeature = map
    .queryRenderedFeatures(e.point)
    .filter((item) => item.layer['source-layer'] === config.sourceLayer)[0];
  if (clickedFeature) {
    updateChartFromClick(clickedFeature, clickedCoords);
  }
};

const processSourceFeatures = (features) => {
  const uniqueFeatures = filterDuplicates(features);

  const data = uniqueFeatures.reduce(
    (acc, current) => {
      config.fields.forEach((field, idx) => {
        acc[idx] += current.properties[field];
      });
      return acc;
    },
    config.fields.map(() => 0)
  );

  // Save the queried data for resetting later
  if (config.summaryType === 'avg') {
    summaryData = data.map((i) => i / uniqueFeatures.length);
  } else {
    summaryData = data;
  }
  updateChartFromFeatures(summaryData);
};

const filterDuplicates = (features) => {
  return Array.from(new Set(features.map((item) => item.id))).map((id) => {
    return features.find((a) => a.id === id);
  });
};

const updateChartFromFeatures = (features) => {
  chart.load({
    columns: [['data'].concat(features)],
    names: { data: `${config.dataSeriesLabel}` },
  });
};

// Build chart from feature
const updateChartFromClick = (feature, coords) => {
  const data = config.fields.reduce((acc, field) => {
    if (feature.properties[field]) {
      acc.push(feature.properties[field]);
    } else {
      acc.push(null);
    }
    return acc;
  }, []);

  chart.load({
    columns: [['data'].concat(data)],
    names: {
      data: coords
    },
  });
};

// Legend
const buildLegend = () => {
  const legend = document.getElementById('legend');
  const legendColors = document.getElementById('legend-colors');
  const legendValues = document.getElementById('legend-values');

  legend.classList.add('block-ml');
  config.legendValues.forEach((stop, idx) => {
    const key = `<div class='col h12' style='background-color:${config.legendColors[idx]}'></div>`;
    const value = `<div class='col align-center'>${stop}</div>`;
    legendColors.innerHTML += key;
    legendValues.innerHTML += value;
  });
};

// Date slider
document.getElementById('slider').setAttribute('max', config.fields.length - 1);
document.getElementById('slider')
  .addEventListener('input', function (e) {
    var dateIdx = parseInt(e.target.value, 10);
    document.getElementById('month').textContent = config.fields[dateIdx];
    if (featureCheck.properties[config.fields[dateIdx]]) {
      updateDate(dateIdx);
    }
  });