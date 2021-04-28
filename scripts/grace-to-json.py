import numpy as np
import xarray as xr
import json
import sys

# local subset of data
gracesub = xr.open_dataset("Desktop/GRACE Project/grace-great-lakes-2.nc")
# local scale factor data
gracescale = xr.open_dataset("Desktop/GRACE Project/scale-factors.nc")
# opendap to full dataset
graceall = xr.open_dataset("https://podaac-opendap.jpl.nasa.gov/opendap/allData/tellus/L3/mascon/RL06/JPL/v02/CRI/netcdf/GRCTellus.JPL.200204_202102.GLO.RL06M.MSCNv02CRI.nc")

# get each dimension
lats = graceall.variables['lat'][:]
lons = graceall.variables['lon'][:]
times = graceall.variables['time']

# subset bbox
lat_bnds, lon_bnds = [41, 50], [267, 285]

# lat/lon indexes for subset area
lat_inds = np.where((lats > lat_bnds[0]) & (lats < lat_bnds[1]))[0]
lon_inds = np.where((lons > lon_bnds[0]) & (lons < lon_bnds[1]))[0]

# get data variable from subset
lwe_subset = gracesub.variables['lwe_thickness'][:]

# bounds for each lat/lon feature in subset
lat_bounds = graceall.variables['lat_bounds'][lat_inds]
lon_bounds = graceall.variables['lon_bounds'][lon_inds]

# scale factors for each lat/lon feature in subset
scale_factor = gracescale.variables['scale_factor'][lat_inds,lon_inds]

# create geojson
def toJson():
    output = {}
    output['type'] = 'FeatureCollection'
    output['features'] = []
    fid = 1
    for y in range(len(lat_inds)):
        for x in range(len(lon_inds)):
            f = {}
            f['id'] = fid
            f['type'] = 'Feature'
            f['properties'] = {}
            f['geometry'] = {}
            f['geometry']['type'] = 'Polygon'
            f['geometry']['coordinates'] = []

            lat_s = lat_bounds[y].item(0)
            lat_n = lat_bounds[y].item(1)
            lon_w = lon_bounds[x].item(0) - 360
            lon_e = lon_bounds[x].item(1) - 360

            ws = [lon_w, lat_s]
            es = [lon_e, lat_s]
            en = [lon_e, lat_n]
            wn = [lon_w, lat_n]

            coords = [ws, es, en, wn, ws]
            f['geometry']['coordinates'].append(coords)
            
            sf = scale_factor[y,x].item(0)

            for t in range(len(times)):
                lwe = lwe_subset[t,y,x].item(0)
                dprop = np.datetime_as_string(times[t], unit='D')[0:7]
                if sf:
                    lwe = lwe*sf
                f['properties'][dprop] = lwe

            output['features'].append(f)
            fid += 1
        
    writeout = json.dumps(output)
    f_out = open('Desktop/GRACE Project/grace-great-lakes-corrected.geojson', 'w')
    f_out.write(writeout)
    f_out.close()
            
toJson()